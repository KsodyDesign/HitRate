-- Базовая инициализация справочной записи (без тестовых листовок)
INSERT INTO campaigns (name, goal, status)
SELECT 'Основная', 'Рекламные листовки', 'active'
WHERE NOT EXISTS (SELECT 1 FROM campaigns);
