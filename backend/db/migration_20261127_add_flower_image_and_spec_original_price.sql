ALTER TABLE flower_material
    ADD COLUMN image_url VARCHAR(500) DEFAULT NULL AFTER color_hex;

ALTER TABLE product_spec
    ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL AFTER price;
