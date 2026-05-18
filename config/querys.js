
const querys = {
    getCategories: "select * from categories order by name",
    getSubCategories: "select * from subcategories order by name",
    getSubcategoriesWithCategories: "SELECT subcategories.id as subcategoryid , subcategories.name as subcategory, subcategories.img_name as subcategoryimage, categories.id as categoryid, categories.name as category, categories.img_name as categoryimage FROM categories, subcategories where categories.id=subcategories.category_id order by categories.name, subcategories.name",
    getCategoriesLeftJoinSubcategories: "SELECT subcategories.id as subcategoryid, subcategories.name as subcategory, subcategories.img_name as subcategoryimage, categories.id as categoryId, categories.name as category,categories.img_name as categoryimage FROM categories LEFT JOIN subcategories ON categories.id = subcategories.category_id ORDER BY categories.name, subcategories.name",
    getCategoriesLeftJoinSubCategoriesLeftJoinSubSubCategories: `SELECT subcategories.id AS subcategoryid,subcategories.name AS subcategory,subcategories.img_name AS subcategoryimage,subsubcategories.id AS subsubcategoryid,subsubcategories.name AS subsubcategory,subsubcategories.image AS subsubcategoryimage,categories.id AS categoryid,categories.name AS category,categories.img_name AS categoryimage FROM categories LEFT JOIN subcategories ON categories.id = subcategories.category_id LEFT JOIN subsubcategories ON subcategories.id = subsubcategories.subcategory_id ORDER BY categories.name, subcategories.name, subsubcategories.name`,
    getUserByEmail: "SELECT * FROM users WHERE email = ?",
    getUserByUserName: "SELECT * FROM users WHERE name = ?",
    createUser: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    updatePassword: `UPDATE users SET password = ? WHERE id = ?`,
    getImagesBySubscriptionId: `select * from images where subscription_id = ?`,
    getFavorites: `select * from favorites where subscription_id = ? and user = ?`,
    deleteFavorites: `DELETE FROM favorites WHERE subscription_id = ? and user = ?`,
    createFavorites: `INSERT INTO favorites (favorite, subscription_id, user) VALUES (?, ?, ?)`,
    getEventsOfCalendarByEmail: `SELECT * FROM calendar WHERE email = ?`,
    createEventOfCalendar: `INSERT INTO calendar (email, title, data, start, end) VALUES (?, ?, ?, ?, ?)`,
    deleteEventOfCalendar: `DELETE FROM calendar WHERE email = ? and id = ?`,
    editEventOfCalendar: `UPDATE calendar SET title = ?, data = ?, start = ?, end = ? WHERE email = ? and id = ?`,
    editUserData: `UPDATE users SET firstname = ?,lastname = ?,street = ?,city = ?,state = ?,country = ?,whatsapp = ?,coordinates = ?,obs = ?,dni = ? WHERE email = ?`,
    getItemsToPublish: 'SELECT CONCAT("cat-", c.id) AS unique_id, c.id, c.name, "category" AS type FROM categories c LEFT JOIN subcategories sc ON c.id = sc.category_id WHERE sc.id IS NULL UNION SELECT CONCAT("subcat-", sc.id) AS unique_id, sc.id, sc.name, "subcategory" AS type FROM subcategories sc LEFT JOIN subsubcategories ssc ON sc.id = ssc.subcategory_id WHERE ssc.id IS NULL UNION SELECT CONCAT("subsubcat-", ssc.id) AS unique_id, ssc.id, ssc.name, "subsubcategory" AS type FROM subsubcategories ssc ORDER BY name',
    saveUserProfileImage: `UPDATE users SET image = ? WHERE email = ?`,
    getPublishersSearchByRubro: `
        SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type AS publisher_suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords AS publisher_keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    p.keywords AS subscription_keywords,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id

WHERE (r.name = ? OR p.in_calamuchitar = 1) and 
    (
        (scat.category_id = ? AND ? = 'category') OR
        (scat.subcategory_id = ? AND ? = 'subcategory') OR
        (scat.subsubcategory_id = ? AND ? = 'subsubcategory')
    );
    `,
    getPublishersSearchByDescription: `SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type AS publisher_suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords AS publisher_keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    MAX(is_discount_plan) AS is_discount_plan, -- Usamos MAX() aquí si no quieres agruparlo
    MAX(s.id) AS subscription_id, -- Usamos MAX() para evitar el error
    MAX(s.creationdate) AS subscription_creationdate,
    p.suscription_type AS subscription_type,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    MAX(s.expiration_date) AS subscription_expiration_date,
    p.modality AS subscription_modality,
    p.keywords AS subscription_keywords,
    MAX(st.name) AS subscription_type_name,
    MAX(st.description) AS subscription_type_description,
    MAX(st.monthly_price) AS subscription_monthly_price,
    MAX(st.annual_price) AS subscription_annual_price,
    MAX(st.promotional_price) AS subscription_promotional_price,
    MAX(r.name) AS region_name,
    MAX(pr.name) AS state_name,
    MAX(co.name) AS country_name,
    MAX(l.name) AS locality_name,
    GROUP_CONCAT(DISTINCT c.name) AS categories,
    GROUP_CONCAT(DISTINCT sc.name) AS subcategories,
    GROUP_CONCAT(DISTINCT ssc.name) AS subsubcategories
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
   (r.name = ? OR p.in_calamuchitar = 1) AND 
    (
        MATCH(p.company_name) AGAINST (? IN BOOLEAN MODE) OR
        FIND_IN_SET(?, p.keywords)
    )
GROUP BY 
    p.id;` ,

    getPublishersSearchByRubroAndDescription: `SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type AS publisher_suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords AS publisher_keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    MAX(s.id) AS subscription_id,  -- Utilizando MAX para la columna de la suscripción
    MAX(s.creationdate) AS subscription_creationdate,
    p.suscription_type AS subscription_type,
    MAX(s.publisher) AS subscription_publisher_id,
    p.price AS subscription_price,
    MAX(s.expiration_date) AS subscription_expiration_date,
    p.modality AS subscription_modality,
    p.keywords AS subscription_keywords,
    MAX(st.name) AS subscription_type_name,
    MAX(st.description) AS subscription_type_description,
    MAX(st.monthly_price) AS subscription_monthly_price,
    MAX(st.annual_price) AS subscription_annual_price,
    MAX(st.promotional_price) AS subscription_promotional_price,
    MAX(c.id) AS category_id,  -- Usar MAX para las columnas de categorías
    MAX(c.name) AS category_name,
    MAX(sc.id) AS subcategory_id,  -- Usar MAX para subcategorías
    MAX(sc.name) AS subcategory_name,
    MAX(ssc.id) AS subsubcategory_id,  -- Usar MAX para subsubcategorías
    MAX(ssc.name) AS subsubcategory_name,
    MAX(r.name) AS region_name,
    MAX(pr.name) AS state_name,
    MAX(co.name) AS country_name,
    MAX(l.name) AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE  
    (r.name = ? OR p.in_calamuchitar = 1) AND 
    (
        (scat.category_id = ? AND ? = 'category') OR
        (scat.subcategory_id = ? AND ? = 'subcategory') OR
        (scat.subsubcategory_id = ? AND ? = 'subsubcategory')
    )
    AND
    (
        MATCH(p.company_name) AGAINST (? IN BOOLEAN MODE) OR
        FIND_IN_SET(?, p.keywords)
    )
GROUP BY 
    p.id;`,

    getSubscriptions: `SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.suscription_type,
    p.site,
    p.name_site,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher,
    p.price,
    p.dummy,
    p.is_restoran,
    is_discount_plan,
    s.expiration_date,
    p.modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price,
    st.annual_price,
    st.promotional_price,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    subscription_categories sc
INNER JOIN 
    subscriptions s ON sc.subscription_id = s.id
INNER JOIN 
    publishers_ac p ON s.publisher = p.id
INNER JOIN 
    suscriptions_type st ON p.suscription_type = st.id
    LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
    (sc.category_id = :category_id OR :category_id IS NULL)
    AND (sc.subcategory_id = :subcategory_id OR :subcategory_id IS NULL)
    AND (sc.subsubcategoria_id = :subsubcategoria_id OR :subsubcategoria_id IS NULL)
GROUP BY 
    p.id`,


    getAllSubscriptions: `
   SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.region,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    p.is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
    r.name = ? OR p.in_calamuchitar = 1
ORDER BY 
    p.dummy ASC;
`,
    getSubscriptionsOfLocality: `
SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name
FROM 
    publishers p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
WHERE 
    ssc.name = ? and  p.city= ? and p.active = true
ORDER BY 
    p.dummy ASC;  
`,
    getSubscriptionsOfRestoransByLocality: `
SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
    (r.name = ? OR p.in_calamuchitar = 1) and 
    sc.name = ? and  l.name= ?
    and p.active = true
ORDER BY 
    p.dummy ASC;
`,
    getSubscriptionsOfSalesByLocality: `
SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
    c.name = 'Turismo' and sc.id = ? and l.name = ? and p.active = true
ORDER BY 
    p.dummy ASC;
`,
    getPublisherDataBySubscriptionId: `
SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.region,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
    LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
     p.company_name= ?;  
`,
    getSubscriptionsCategories: `
    SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.region,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    p.is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
    (r.name = ? OR p.in_calamuchitar = 1 ) AND (c.id = ? AND sc.id IS NULL AND ssc.id IS NULL) and p.active = true
ORDER BY 
    p.dummy ASC;
`,
    getSubscriptionsSubCategories: `
    SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.region,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    p.is_discount_plan,
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
   ( r.name = ? OR p.in_calamuchitar = 1 ) AND (c.id = ? AND sc.id = ? AND ssc.id IS NULL) and p.active = true
ORDER BY 
    p.dummy ASC;
`,
    getSubscriptionsSubSubCategories: `
    SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.region, -- Incluida la región en el SELECT
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.in_calamuchitar,
    p.is_restoran,
    p.is_discount_plan, 
    p.suscription_type AS subscription_type,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
WHERE 
   ( r.name = ? OR p.in_calamuchitar = 1 ) AND (c.id = ? AND sc.id = ? AND ssc.id = ?) and p.active = true
ORDER BY 
    p.dummy ASC;
`,
    getFavoritesByEmail: `SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.region,
    p.state,
    p.country,
    p.suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.is_restoran,
    is_discount_plan,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    r.name AS region_name,
    pr.name AS state_name,
    co.name AS country_name,
    l.name AS locality_name,
    GROUP_CONCAT(DISTINCT c.id) AS category_ids,
    GROUP_CONCAT(DISTINCT c.name) AS category_names,
    GROUP_CONCAT(DISTINCT sc.id) AS subcategory_ids,
    GROUP_CONCAT(DISTINCT sc.name) AS subcategory_names,
    GROUP_CONCAT(DISTINCT ssc.id) AS subsubcategory_ids,
    GROUP_CONCAT(DISTINCT ssc.name) AS subsubcategory_names
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
LEFT JOIN 
    regions r ON p.region = r.id
LEFT JOIN 
    states pr ON p.state = pr.id
LEFT JOIN 
    countries co ON p.country = co.id
LEFT JOIN 
    locality l ON p.city = l.id
JOIN 
    favorites f ON s.id = f.subscription_id
WHERE 
    f.user = ? 
GROUP BY 
    p.id, 
    s.id, 
    st.id;`,
    getToDoNotesByEmail: `select * from todonotes where email = ? order by id desc`,
    createToDoNotes: "INSERT INTO todonotes (email, text, created_date, completed) VALUES (?, ?, ?, ?)",
    updateToDoNotes: `UPDATE todonotes SET text = ? WHERE id = ?`,
    deleteToDoNotes: `DELETE FROM todonotes WHERE id = ?`,
    getPublisherByNameSite: `
        SELECT 
    p.id AS publisher_id,
    p.creationdate AS publisher_creationdate,
    p.firstname,
    p.lastname,
    p.active,
    p.street,
    p.city,
    p.state,
    p.country,
    p.suscription_type AS publisher_suscription_type,
    p.username,
    p.password,
    p.coordinates,
    p.rating,
    p.eshoop,
    p.description1,
    p.description2,
    p.profileimage,
    p.keywords AS publisher_keywords,
    p.web,
    p.ig,
    p.fb,
    p.phone,
    p.whatsapp,
    p.email1,
    p.email2,
    p.profile_image,
    p.delivery,
    p.company_name,
    p.images,
    p.site,
    p.name_site,
    p.dummy,
    p.is_restoran,
    is_discount_plan,
    s.id AS subscription_id,
    s.creationdate AS subscription_creationdate,
    s.publisher AS subscription_publisher_id,
    p.price AS subscription_price,
    s.expiration_date AS subscription_expiration_date,
    p.modality AS subscription_modality,
    p.keywords AS subscription_keywords,
    st.name AS subscription_type_name,
    st.description AS subscription_type_description,
    st.monthly_price AS subscription_monthly_price,
    st.annual_price AS subscription_annual_price,
    st.promotional_price AS subscription_promotional_price,
    c.id AS category_id,
    c.name AS category_name,
    sc.id AS subcategory_id,
    sc.name AS subcategory_name,
    ssc.id AS subsubcategory_id,
    ssc.name AS subsubcategory_name
FROM 
    publishers_ac p
JOIN 
    subscriptions s ON p.id = s.publisher
LEFT JOIN 
    subscription_categories scat ON s.id = scat.subscription_id
LEFT JOIN 
    categories c ON scat.category_id = c.id
LEFT JOIN 
    subcategories sc ON scat.subcategory_id = sc.id
LEFT JOIN 
    subsubcategories ssc ON scat.subsubcategory_id = ssc.id
LEFT JOIN 
    suscriptions_type st ON p.suscription_type = st.id
WHERE 
    p.name_site = ?    `,
    getRegionOfCities: `
    SELECT 
    locality.id AS city_id,
    locality.name AS city_name,
    regions.id AS region_id,
    regions.name AS region_name,
    states.id AS state_id,
    states.name AS state_name,
    countries.id AS country_id,
    countries.name AS country_name
FROM 
    locality
JOIN 
    regions ON locality.region_id = regions.id
JOIN 
    states ON regions.state_id = states.id
JOIN 
    countries ON states.country_id = countries.id
ORDER BY 
    countries.name, states.name, locality.name;

    `

};


export default querys;
