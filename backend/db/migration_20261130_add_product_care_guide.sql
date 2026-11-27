-- 商品养护指南
-- 适用于已初始化过的 flower_shop 数据库。
USE flower_shop;

ALTER TABLE product
    ADD COLUMN care_guide TEXT DEFAULT NULL
        COMMENT '养护指南，空行分隔章节' AFTER gift_accessories;
