const { query } = require("../config/database");

const canViewAllAnalytics = (role) => role === "admin" || role === "editor";

const parseDateRange = (req) => {
  const { from, to } = req.query;

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) {
    return { error: "Dates must use YYYY-MM-DD format." };
  }

  const startDate = from || "1970-01-01";
  const endDate = to || new Date().toISOString().slice(0, 10);

  if (startDate > endDate) {
    return { error: "'from' date must not be later than 'to' date." };
  }

  return { startDate, endDate };
};

// GET /api/v1/analytics/dashboard
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    if (!canViewAllAnalytics(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admins and editors can view dashboard analytics.",
      });
    }

    const [posts, users, comments, media, views, topPosts] = await Promise.all([
      query(
        `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'published')::int AS published,
             COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
             COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
           FROM posts`,
      ),

      query(
        `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
             COUNT(*) FILTER (WHERE role = 'editor')::int AS editors,
             COUNT(*) FILTER (WHERE role = 'author')::int AS authors,
             COUNT(*) FILTER (WHERE role = 'subscriber')::int AS subscribers
           FROM users`,
      ),

      query(
        `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
             COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
             COUNT(*) FILTER (WHERE status = 'spam')::int AS spam
           FROM comments`,
      ),

      query(
        `SELECT COUNT(*)::int AS total
           FROM media`,
      ),

      query(
        `SELECT
       COUNT(*)::bigint AS total_views,
       COUNT(*)::int AS unique_post_view_records
     FROM post_views`,
      ),

      query(
        `SELECT p.post_id, p.title, p.slug, p.views,
                  u.username AS author_username
           FROM posts p
           LEFT JOIN users u ON u.user_id = p.author_id
           WHERE p.status = 'published'
           ORDER BY p.views DESC, p.created_at DESC
           LIMIT 5`,
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        posts: posts.rows[0],
        users: users.rows[0],
        comments: comments.rows[0],
        media: media.rows[0],
        views: views.rows[0],
        topPosts: topPosts.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/views?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getDailyViews = async (req, res, next) => {
  try {
    if (!canViewAllAnalytics(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view these analytics.",
      });
    }

    const { startDate, endDate, error } = parseDateRange(req);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const result = await query(
      `SELECT view_date, COUNT(*)::int AS views
       FROM post_views
       WHERE view_date BETWEEN $1::date AND $2::date
       GROUP BY view_date
       ORDER BY view_date ASC`,
      [startDate, endDate],
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      period: { from: startDate, to: endDate },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/posts/top?limit=10
exports.getTopPosts = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      50,
    );

    const values = [];
    let authorCondition = "";

    if (req.user.role === "author") {
      values.push(req.user.userId);
      authorCondition = `AND p.author_id = $${values.length}`;
    } else if (!canViewAllAnalytics(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view post analytics.",
      });
    }

    values.push(limit);

    const result = await query(
      `SELECT p.post_id, p.title, p.slug, p.views,
              p.published_at, u.username AS author_username
       FROM posts p
       LEFT JOIN users u ON u.user_id = p.author_id
       WHERE p.status = 'published'
       ${authorCondition}
       ORDER BY p.views DESC, p.published_at DESC
       LIMIT $${values.length}`,
      values,
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/posts/:postId
exports.getPostAnalytics = async (req, res, next) => {
  try {
    const postResult = await query(
      `SELECT post_id, title, author_id, status, views
       FROM posts
       WHERE post_id = $1`,
      [req.params.postId],
    );

    if (!postResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const post = postResult.rows[0];

    const isOwner =
      req.user.role === "author" &&
      Number(post.author_id) === Number(req.user.userId);

    if (!canViewAllAnalytics(req.user.role) && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You cannot view analytics for this post.",
      });
    }

    const { startDate, endDate, error } = parseDateRange(req);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const result = await query(
      `SELECT view_date, COUNT(*)::int AS views
       FROM post_views
       WHERE post_id = $1
         AND view_date BETWEEN $2::date AND $3::date
       GROUP BY view_date
       ORDER BY view_date ASC`,
      [post.post_id, startDate, endDate],
    );

    const periodViews = result.rows.reduce(
      (total, row) => total + row.views,
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        post,
        period: {
          from: startDate,
          to: endDate,
          views: periodViews,
        },
        dailyViews: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/analytics/authors/:authorId
exports.getAuthorAnalytics = async (req, res, next) => {
  try {
    const authorId = Number(req.params.authorId);

    if (!Number.isInteger(authorId) || authorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid author ID.",
      });
    }

    const isSelf =
      req.user.role === "author" && Number(req.user.userId) === authorId;

    if (!canViewAllAnalytics(req.user.role) && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "You cannot view these author analytics.",
      });
    }

    const result = await query(
      `SELECT
         u.user_id,
         u.username,
         COUNT(p.post_id)::int AS total_posts,
         COUNT(p.post_id) FILTER (WHERE p.status = 'published')::int
           AS published_posts,
         COUNT(p.post_id) FILTER (WHERE p.status = 'draft')::int
           AS draft_posts,
         COALESCE(SUM(p.views), 0)::bigint AS total_views
       FROM users u
       LEFT JOIN posts p ON p.author_id = u.user_id
       WHERE u.user_id = $1 AND u.role = 'author'
       GROUP BY u.user_id, u.username`,
      [authorId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Author not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
