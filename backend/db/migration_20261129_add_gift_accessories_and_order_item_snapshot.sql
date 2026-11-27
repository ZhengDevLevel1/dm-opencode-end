-- 商品随赠配件与履约商品快照
-- 适用于已初始化过的 flower_shop 数据库。
USE flower_shop;

ALTER TABLE product
    ADD COLUMN gift_accessories VARCHAR(200) NOT NULL
        DEFAULT '手写贺卡 ×1 · 保鲜剂 ×2 · 养护卡 ×1'
        COMMENT '随赠配件' AFTER description;

ALTER TABLE order_item
    ADD COLUMN flower_summary VARCHAR(500) DEFAULT NULL
        COMMENT '花材种类与数量快照' AFTER wrap_name,
    ADD COLUMN gift_accessories VARCHAR(200) DEFAULT NULL
        COMMENT '随赠配件快照' AFTER flower_summary;

UPDATE order_item oi
JOIN product p ON p.id = oi.product_id
SET oi.gift_accessories = p.gift_accessories
WHERE oi.gift_accessories IS NULL;

UPDATE order_item oi
SET oi.flower_summary = (
    SELECT GROUP_CONCAT(CONCAT(fm.name, ' ×', psf.quantity)
                        ORDER BY psf.id SEPARATOR '、')
    FROM product_spec_flower psf
    JOIN flower_material fm ON fm.id = psf.material_id
    WHERE psf.spec_id = oi.spec_id
)
WHERE oi.spec_id > 0;

UPDATE order_item oi
SET oi.flower_summary = (
    SELECT GROUP_CONCAT(fm.name ORDER BY pfm.sort_order, pfm.id SEPARATOR '、')
    FROM product_flower_material pfm
    JOIN flower_material fm ON fm.id = pfm.material_id
    WHERE pfm.product_id = oi.product_id
)
WHERE (oi.flower_summary IS NULL OR oi.flower_summary = '')
  AND oi.spec_id = 0;
