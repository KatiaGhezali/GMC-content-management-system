const buildSeoMetadata = (post) => {
  const plainText = (post.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const descriptionSource = post.meta_description || post.excerpt || plainText;

  const description = descriptionSource.slice(0, 320);

  return {
    title: post.seo_title || post.title,
    description,
    keywords: post.meta_keywords || "",
    canonicalUrl: post.canonical_url || null,
    openGraph: {
      title: post.og_title || post.seo_title || post.title,
      description: post.og_description || description,
      image: post.og_image || null,
      type: "article",
    },
  };
};

module.exports = { buildSeoMetadata };
