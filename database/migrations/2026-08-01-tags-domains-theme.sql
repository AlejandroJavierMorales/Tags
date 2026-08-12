ALTER TABLE tags_domains
  ADD COLUMN theme_id INT NULL AFTER theme_color,
  ADD INDEX idx_tags_domains_theme_id (theme_id),
  ADD CONSTRAINT fk_tags_domains_theme
    FOREIGN KEY (theme_id)
    REFERENCES tags_qr_page_themes(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
