const { query, transaction } = require("../config/database");
const { generateSlug } = require("../utils/helpers");

const crypto = require("crypto");
const { buildSeoMetadata } = require("../utils/seo");
const trackPostView = async (postId, req) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for view tracking.");
  }

  const visitorData = `${req.ip || "unknown"}|${req.get("user-agent") || "unknown"}`;

  const visitorHash = crypto
    .createHmac("sha256", secret)
    .update(visitorData)
    .digest("hex");

  await query(
    `WITH inserted_view AS (
       INSERT INTO post_views (post_id, visitor_hash)
       VALUES ($1, $2)
       ON CONFLICT (post_id, visitor_hash, view_date)
       DO NOTHING
       RETURNING post_id
     )
     UPDATE posts
     SET views = COALESCE(views, 0) + 1
     WHERE post_id IN (SELECT post_id FROM inserted_view)`,
    [postId, visitorHash],
  );
};
const allowedStatuses = ["draft", "published", "archived"];

const canManageAllPosts = (role) => role === "admin" || role === "editor";

const canManagePost = (user, post) =>
  canManageAllPosts(user.role) ||
  (user.role === "author" && post.author_id === user.userId);

const getPostById = async (postId) => {
  const result = await query(
    `SELECT p.*,
            u.username AS author_username,
            c.name AS category_name
     FROM posts p
     LEFT JOIN users u ON u.user_id = p.author_id
     LEFT JOIN categories c ON c.category_id = p.category_id
     WHERE p.post_id = $1`,
    [postId],
  );

  return result.rows[0];
};

const saveRevision = async (client, post, createdBy) => {
  // Lock the post row to prevent concurrent revision numbering.
  await client.query(
    `SELECT post_id
     FROM posts
     WHERE post_id = $1
     FOR UPDATE`,
    [post.post_id],
  );

  // Calculate the next revision number.
  const numberResult = await client.query(
    `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_number
     FROM post_revisions
     WHERE post_id = $1`,
    [post.post_id],
  );

  const revisionNumber = numberResult.rows[0].next_number;

  // Save the current post state, including SEO metadata.
  await client.query(
    `INSERT INTO post_revisions
      (post_id, title, slug, content, excerpt, category_id,
       status, published_at, revision_number, created_by,
       seo_title, meta_description, meta_keywords, canonical_url,
       og_title, og_description, og_image)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16, $17)`,
    [
      post.post_id,
      post.title,
      post.slug,
      post.content,
      post.excerpt,
      post.category_id,
      post.status,
      post.published_at,
      revisionNumber,
      createdBy,
      post.seo_title,
      post.meta_description,
      post.meta_keywords,
      post.canonical_url,
      post.og_title,
      post.og_description,
      post.og_image,
    ],
  );
};
const getTagsForPost = async (postId) => {
  const result = await query(
    `SELECT t.tag_id, t.name, t.slug
     FROM tags t
     INNER JOIN post_tags pt ON pt.tag_id = t.tag_id
     WHERE pt.post_id = $1
     ORDER BY t.name`,
    [postId],
  );

  return result.rows;
};

const replacePostTags = async (client, postId, tagIds = []) => {
  await client.query("DELETE FROM post_tags WHERE post_id = $1", [postId]);

  const uniqueTagIds = [...new Set(tagIds.map(Number))];

  for (const tagId of uniqueTagIds) {
    if (!Number.isInteger(tagId) || tagId <= 0) {
      throw Object.assign(new Error("Invalid tag ID."), { status: 400 });
    }

    const tag = await client.query(
      "SELECT tag_id FROM tags WHERE tag_id = $1",
      [tagId],
    );

    if (!tag.rows.length) {
      throw Object.assign(new Error(`Tag ${tagId} does not exist.`), {
        status: 400,
      });
    }

    await client.query(
      "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)",
      [postId, tagId],
    );
  }
};

// GET /api/v1/posts
exports.getPosts = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    // Visitors and subscribers only see published posts.
    if (!req.user || req.user.role === "subscriber") {
      addCondition("p.status = ?", "published");
    } else if (req.user.role === "author") {
      values.push(req.user.userId);
      conditions.push(
        `(p.status = 'published' OR (p.author_id = $${values.length} AND p.status IN ('draft', 'archived')))`,
      );
    } else if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid post status.",
        });
      }

      addCondition("p.status = ?", req.query.status);
    }

    if (req.query.categoryId) {
      addCondition("p.category_id = ?", Number(req.query.categoryId));
    }

    if (req.query.authorId && req.user && canManageAllPosts(req.user.role)) {
      addCondition("p.author_id = ?", Number(req.query.authorId));
    }

    if (req.query.search) {
      values.push(`%${req.query.search.trim()}%`);
      conditions.push(
        `(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length})`,
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM posts p ${whereClause}`,
      values,
    );

    const total = countResult.rows[0].total;

    const postsResult = await query(
      `SELECT p.post_id, p.title, p.slug, p.excerpt, p.status,
              p.category_id, p.author_id, p.published_at,
              p.created_at, p.updated_at,
              u.username AS author_username,
              c.name AS category_name
       FROM posts p
       LEFT JOIN users u ON u.user_id = p.author_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return res.status(200).json({
      success: true,
      data: postsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/posts/:id
exports.getPost = async (req, res, next) => {
  try {
    const post = await getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isPublished = post.status === "published";
    const isOwner = req.user && post.author_id === req.user.userId;
    const isPrivileged = req.user && canManageAllPosts(req.user.role);

    if (!isPublished && !isOwner && !isPrivileged) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    // Only count views of publicly published posts.
    if (isPublished) {
      await trackPostView(post.post_id, req);
    }

    const tags = await getTagsForPost(post.post_id);
    const seo = buildSeoMetadata(post);
    return res.status(200).json({
      success: true,
      data: { ...post, tags, seo },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/posts
exports.createPost = async (req, res, next) => {
  try {
    const {
      title,
      content,
      excerpt,
      categoryId,
      status = "draft",
      tagIds = [],
      seoTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
    } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Authors can create drafts only. Editors and admins may publish posts.",
      });
    }

    if (status === "published" && !canManageAllPosts(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and editors can publish posts.",
      });
    }

    if (categoryId) {
      const category = await query(
        "SELECT category_id FROM categories WHERE category_id = $1 AND is_active = TRUE",
        [categoryId],
      );

      if (!category.rows.length) {
        return res.status(400).json({
          success: false,
          message: "The selected category does not exist or is inactive.",
        });
      }
    }

    const slug = generateSlug(title);

    const result = await transaction(async (client) => {
      const existing = await client.query(
        "SELECT post_id FROM posts WHERE slug = $1",
        [slug],
      );

      const uniqueSlug = existing.rows.length ? `${slug}-${Date.now()}` : slug;

      const postResult = await client.query(
        `INSERT INTO posts
    (title, slug, content, excerpt, author_id, category_id,
     status, published_at, seo_title, meta_description,
     meta_keywords, canonical_url, og_title, og_description, og_image)
   VALUES
    ($1, $2, $3, $4, $5, $6, $7,
     CASE WHEN $7::varchar = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END,
     $8, $9, $10, $11, $12, $13, $14)
   RETURNING *`,
        [
          title,
          uniqueSlug,
          content,
          excerpt || null,
          req.user.userId,
          categoryId || null,
          status,
          seoTitle || null,
          metaDescription || null,
          metaKeywords || null,
          canonicalUrl || null,
          ogTitle || null,
          ogDescription || null,
          ogImage || null,
        ],
      );

      const post = postResult.rows[0];

      await replacePostTags(client, post.post_id, tagIds);

      return post;
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/posts/:id
exports.updatePost = async (req, res, next) => {
  try {
    const post = await getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (!canManagePost(req.user, post)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this post.",
      });
    }

    const {
      title,
      content,
      excerpt,
      categoryId,
      status,
      tagIds,
      seoTitle,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
    } = req.body;

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post status.",
      });
    }

    if (status && status !== "draft" && !canManageAllPosts(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and editors can publish or archive posts.",
      });
    }

    if (categoryId) {
      const category = await query(
        "SELECT category_id FROM categories WHERE category_id = $1 AND is_active = TRUE",
        [categoryId],
      );

      if (!category.rows.length) {
        return res.status(400).json({
          success: false,
          message: "The selected category does not exist or is inactive.",
        });
      }
    }

    const updated = await transaction(async (client) => {
      // Save the previous state before applying changes.
      await saveRevision(client, post, req.user.userId);

      const fields = [];
      const values = [];

      const addField = (column, value) => {
        values.push(value);
        fields.push(`${column} = $${values.length}`);
      };

      // Basic post fields.
      if (title !== undefined) {
        addField("title", title);

        const baseSlug = generateSlug(title);
        const uniqueSlug = `${baseSlug}-${post.post_id}`;
        addField("slug", uniqueSlug);
      }

      if (content !== undefined) {
        addField("content", content);
      }

      if (excerpt !== undefined) {
        addField("excerpt", excerpt || null);
      }

      if (categoryId !== undefined) {
        addField("category_id", categoryId || null);
      }

      // Publishing status.
      if (status !== undefined) {
        addField("status", status);

        if (status === "published" && !post.published_at) {
          fields.push("published_at = CURRENT_TIMESTAMP");
        } else if (status !== "published") {
          fields.push("published_at = NULL");
        }
      }

      // SEO metadata.
      if (seoTitle !== undefined) {
        addField("seo_title", seoTitle || null);
      }

      if (metaDescription !== undefined) {
        addField("meta_description", metaDescription || null);
      }

      if (metaKeywords !== undefined) {
        addField("meta_keywords", metaKeywords || null);
      }

      if (canonicalUrl !== undefined) {
        addField("canonical_url", canonicalUrl || null);
      }

      if (ogTitle !== undefined) {
        addField("og_title", ogTitle || null);
      }

      if (ogDescription !== undefined) {
        addField("og_description", ogDescription || null);
      }

      if (ogImage !== undefined) {
        addField("og_image", ogImage || null);
      }

      let updatedPost = post;

      // Update the post only if at least one field was provided.
      if (fields.length) {
        values.push(post.post_id);

        const result = await client.query(
          `UPDATE posts
           SET ${fields.join(", ")},
               updated_at = CURRENT_TIMESTAMP
           WHERE post_id = $${values.length}
           RETURNING *`,
          values,
        );

        updatedPost = result.rows[0];
      }

      // Update tags if provided.
      if (tagIds !== undefined) {
        if (!Array.isArray(tagIds)) {
          throw Object.assign(new Error("tagIds must be an array."), {
            status: 400,
          });
        }

        await replacePostTags(client, post.post_id, tagIds);
      }

      return updatedPost;
    });

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/posts/:id
exports.deletePost = async (req, res, next) => {
  try {
    const post = await getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (!canManagePost(req.user, post)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this post.",
      });
    }

    await query("DELETE FROM posts WHERE post_id = $1", [post.post_id]);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
