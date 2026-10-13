INSERT INTO "tags" ("name", "slug", "is_active")
VALUES
	('Fantasy', 'fantasy', true),
	('Horreur', 'horreur', true),
	('Débutant', 'debutant', true),
	('Exploration', 'exploration', true),
	('Roleplay', 'roleplay', true),
	('Science-fiction', 'science-fiction', true),
	('Mystère', 'mystere', true),
	('One-shot', 'one-shot', true)
ON CONFLICT ("slug") DO NOTHING;
