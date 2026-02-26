-- Update Rosebank deal to renovation stage and add comprehensive renovation data

-- First, update the Rosebank deal stage to 'renovating'
UPDATE "Deal" 
SET "stage" = 'renovating'
WHERE "name" = '12 Oak Lane, Rosebank' AND "stage" != 'renovating';

-- Get the deal ID and org ID for use in subsequent inserts
WITH deal_info AS (
  SELECT d."id" as deal_id, d."orgId", d."userId"
  FROM "Deal" d
  WHERE d."name" = '12 Oak Lane, Rosebank'
)

INSERT INTO "Milestone" ("id", "orgId", "userId", "dealId", "title", "description", "status", "order", "dueDate", "completedDate", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  deal_info."orgId",
  deal_info."userId",
  deal_info."deal_id",
  'Demolition & Strip-out',
  'Remove old kitchen, bathrooms, flooring, prepare for major works',
  'completed',
  1,
  '2026-01-08'::timestamp,
  '2026-01-07'::timestamp,
  NOW(),
  NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Demolition & Strip-out');

-- Insert remaining milestones
WITH deal_info AS (
  SELECT d."id" as deal_id, d."orgId", d."userId"
  FROM "Deal" d
  WHERE d."name" = '12 Oak Lane, Rosebank'
)
INSERT INTO "Milestone" ("id", "orgId", "userId", "dealId", "title", "description", "status", "order", "dueDate", "createdAt", "updatedAt")
SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Structural Repairs & Treatment', 'Address any structural issues, damp proofing, pest treatment', 'completed', 2, '2026-01-15'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Structural Repairs & Treatment')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Plumbing & Electrical Rough-in', 'First fix plumbing and electrical - all pipes and wiring laid out', 'in_progress', 3, '2026-02-10'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Plumbing & Electrical Rough-in')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Plastering & Drywall', 'Prepare all surfaces with drywall and plaster ready for painting', 'in_progress', 4, '2026-02-18'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Plastering & Drywall')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Flooring Installation', 'Install all flooring - tiles, laminates, and other finishes', 'pending', 5, '2026-02-25'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Flooring Installation')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Kitchen & Bathroom Fit-out', 'Install fixtures, fittings, cabinets and all bathroom items', 'pending', 6, '2026-03-08'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Kitchen & Bathroom Fit-out')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Painting & Interior Finishes', 'Paint all interior surfaces and apply final finishes', 'pending', 7, '2026-03-15'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Painting & Interior Finishes')

UNION ALL

SELECT gen_random_uuid(), deal_info."orgId", deal_info."userId", deal_info."deal_id", 'Final Fixtures & Inspections', 'Install all light fittings, do final electrical and plumbing checks', 'pending', 8, '2026-03-20'::timestamp, NOW(), NOW()
FROM deal_info
WHERE NOT EXISTS (SELECT 1 FROM "Milestone" WHERE "dealId" = deal_info."deal_id" AND "title" = 'Final Fixtures & Inspections');

-- Add comprehensive expenses
WITH deal_info AS (
  SELECT d."id" as deal_id, d."orgId", d."userId"
  FROM "Deal" d
  WHERE d."name" = '12 Oak Lane, Rosebank'
)
INSERT INTO "Expense" ("id", "orgId", "userId", "dealId", "category", "description", "amount", "date", "vendor", "paymentMethod", "isProjected", "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Demolition waste removal', 8500, '2026-01-01'::date, 'Waste Removal SA', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Demolition and strip-out labour (5 days)', 12000, '2026-01-05'::date, 'Mokoena Builders', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Structural inspection and repairs', 6500, '2026-01-08'::date, 'BuildTest CC', 'card', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'plumbing', 'Rough-in plumbing - kitchen & bathrooms', 16800, '2026-01-15'::date, 'Ndlovu Plumbing Services', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'electrical', 'Electrical rough-in and DB board', 24500, '2026-01-20'::date, 'Sparks Electrical CC', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Geyser and hot water pipes', 8200, '2026-01-22'::date, 'Builders Warehouse', 'card', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Plasterboard and drywall materials', 12500, '2026-01-25'::date, 'Plasterboard SA', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Plastering and drywall labour (6 days)', 14400, '2026-02-02'::date, 'Mokoena Builders', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Kitchen cabinets and countertops', 45000, '2026-02-05'::date, 'Builders Warehouse', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Floor tiles (porcelain 60x60)', 15500, '2026-02-05'::date, 'CTM', 'card', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Bathroom tiles and grout', 8900, '2026-02-08'::date, 'CTM', 'card', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Kitchen installation labour', 18000, '2026-02-10'::date, 'Mokoena Builders', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'plumbing', 'Bathroom replumbing and fixtures', 32000, '2026-02-12'::date, 'Ndlovu Plumbing Services', 'eft', false, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Flooring installation labour (4 days)', 9600, '2026-02-20'::date, 'Mokoena Builders', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Tiling labour for bathrooms (3 days)', 7200, '2026-02-25'::date, 'Mokoena Builders', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Paint and primer (15 rooms)', 9800, '2026-03-01'::date, 'Builders Warehouse', 'card', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Painting labour (5 days)', 12000, '2026-03-05'::date, 'Mokoena Builders', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Light fittings and switches (complete set)', 11200, '2026-03-08'::date, 'Hirsch''s', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Final electrical inspection and COC', 5500, '2026-03-12'::date, 'Sparks Electrical CC', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'labour', 'Plumbing final inspection', 3200, '2026-03-14'::date, 'Ndlovu Plumbing Services', 'eft', true, NOW(), NOW()),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'materials', 'Contingency - punch-list items', 15000, '2026-03-20'::date, 'Various', 'eft', true, NOW(), NOW());

-- Add activities
WITH deal_info AS (
  SELECT d."id" as deal_id, d."orgId", d."userId"
  FROM "Deal" d
  WHERE d."name" = '12 Oak Lane, Rosebank'
)
INSERT INTO "Activity" ("id", "orgId", "userId", "dealId", "type", "description", "metadata", "timestamp")
VALUES 
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'deal_created', 'Deal created and added to pipeline', NULL, '2025-11-10'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'deal_moved', 'Moved to ''purchased'' stage', '{"fromStage":"offer_made","toStage":"purchased"}'::jsonb, '2025-11-20'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'deal_moved', 'Moved to ''renovating'' stage - work commenced', '{"fromStage":"purchased","toStage":"renovating"}'::jsonb, '2025-12-20'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'note_added', 'Inspection completed - no major structural issues found', '{"inspector":"BuildTest CC","date":"2026-01-08"}'::jsonb, '2026-01-08'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'task_completed', 'Demolition phase completed on schedule', '{"phase":"Demolition & Strip-out","daysAhead":1}'::jsonb, '2026-01-07'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'contractor_added', 'Assigned Mokoena Builders for primary construction work', '{"contractor":"Thabo Mokoena"}'::jsonb, '2026-01-08'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'contractor_added', 'Assigned Ndlovu Plumbing Services for plumbing works', '{"contractor":"Sipho Ndlovu"}'::jsonb, '2026-01-12'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'expense_logged', 'Completed expenses: R45,000 (demolition & labour)', '{"total":45000,"category":"completed"}'::jsonb, '2026-01-15'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'milestone_started', 'Structural repairs and treatment started', '{"milestone":"Structural Repairs & Treatment"}'::jsonb, '2026-01-08'::timestamp),
  (gen_random_uuid(), (SELECT "orgId" FROM deal_info), (SELECT "userId" FROM deal_info), (SELECT deal_id FROM deal_info), 'note_added', 'Electrical contractor (Sparks CC) on standby for final sign-off', '{"contractor":"Johan van der Merwe"}'::jsonb, '2026-02-01'::timestamp);
