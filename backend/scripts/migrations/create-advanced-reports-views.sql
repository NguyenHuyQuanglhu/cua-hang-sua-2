-- Create view for profit analysis
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProfitAnalysis')
    DROP VIEW vw_ProfitAnalysis;
GO

CREATE VIEW vw_ProfitAnalysis AS
SELECT 
    s.id as sale_id,
    s.store_id,
    s.invoice_number,
    s.transaction_date,
    s.customer_id,
    c.full_name as customer_name,
    s.total_amount,
    s.final_amount as revenue,
    s.discount,
    s.tier_discount_amount,
    s.points_discount,
    -- Calculate total cost
    (SELECT SUM(si.quantity * ISNULL(p.cost_price, 0))
     FROM SaleItems si
     LEFT JOIN Products p ON si.product_id = p.id
     WHERE si.sale_id = s.id) as total_cost,
    -- Calculate profit
    s.final_amount - (SELECT SUM(si.quantity * ISNULL(p.cost_price, 0))
                      FROM SaleItems si
                      LEFT JOIN Products p ON si.product_id = p.id
                      WHERE si.sale_id = s.id) as profit,
    -- Calculate profit margin
    CASE 
        WHEN s.final_amount > 0 THEN
            ((s.final_amount - (SELECT SUM(si.quantity * ISNULL(p.cost_price, 0))
                                FROM SaleItems si
                                LEFT JOIN Products p ON si.product_id = p.id
                                WHERE si.sale_id = s.id)) / s.final_amount) * 100
        ELSE 0
    END as profit_margin_percentage,
    s.status,
    s.created_at
FROM Sales s
LEFT JOIN Customers c ON s.customer_id = c.id
WHERE s.status IN ('pending', 'printed');
GO

-- Create view for sales trends
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_SalesTrends')
    DROP VIEW vw_SalesTrends;
GO

CREATE VIEW vw_SalesTrends AS
SELECT 
    s.store_id,
    CAST(s.transaction_date AS DATE) as sale_date,
    DATEPART(YEAR, s.transaction_date) as year,
    DATEPART(MONTH, s.transaction_date) as month,
    DATEPART(WEEK, s.transaction_date) as week,
    DATEPART(WEEKDAY, s.transaction_date) as day_of_week,
    DATEPART(HOUR, s.transaction_date) as hour_of_day,
    COUNT(s.id) as transaction_count,
    SUM(s.total_amount) as total_sales,
    SUM(s.final_amount) as total_revenue,
    SUM(s.discount + ISNULL(s.tier_discount_amount, 0) + ISNULL(s.points_discount, 0)) as total_discounts,
    AVG(s.final_amount) as average_transaction_value,
    COUNT(DISTINCT s.customer_id) as unique_customers
FROM Sales s
WHERE s.status IN ('pending', 'printed')
GROUP BY 
    s.store_id,
    CAST(s.transaction_date AS DATE),
    DATEPART(YEAR, s.transaction_date),
    DATEPART(MONTH, s.transaction_date),
    DATEPART(WEEK, s.transaction_date),
    DATEPART(WEEKDAY, s.transaction_date),
    DATEPART(HOUR, s.transaction_date);
GO

-- Create view for product performance
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ProductPerformance')
    DROP VIEW vw_ProductPerformance;
GO

CREATE VIEW vw_ProductPerformance AS
SELECT 
    p.id as product_id,
    p.store_id,
    p.name as product_name,
    p.sku,
    c.name as category_name,
    p.cost_price,
    p.selling_price,
    -- Sales metrics
    COUNT(DISTINCT si.sale_id) as times_sold,
    SUM(si.quantity) as total_quantity_sold,
    SUM(si.subtotal) as total_revenue,
    SUM(si.quantity * p.cost_price) as total_cost,
    SUM(si.subtotal - (si.quantity * p.cost_price)) as total_profit,
    AVG(si.price) as average_selling_price,
    -- Profit margin
    CASE 
        WHEN SUM(si.subtotal) > 0 THEN
            ((SUM(si.subtotal - (si.quantity * p.cost_price)) / SUM(si.subtotal)) * 100)
        ELSE 0
    END as profit_margin_percentage,
    -- Inventory
    ISNULL(pi.quantity, 0) as current_stock,
    p.low_stock_threshold,
    -- Last sale date
    MAX(s.transaction_date) as last_sale_date
FROM Products p
LEFT JOIN Categories c ON p.CategoryId = c.id
LEFT JOIN SaleItems si ON p.id = si.product_id
LEFT JOIN Sales s ON si.sale_id = s.id AND s.status IN ('pending', 'printed')
LEFT JOIN ProductInventory pi ON p.id = pi.product_id
WHERE p.status = 'active'
GROUP BY 
    p.id, p.store_id, p.name, p.sku, c.name, 
    p.cost_price, p.selling_price, pi.quantity, p.low_stock_threshold;
GO

-- Create view for customer analytics
IF EXISTS (SELECT * FROM sys.views WHERE name = 'vw_CustomerAnalytics')
    DROP VIEW vw_CustomerAnalytics;
GO

CREATE VIEW vw_CustomerAnalytics AS
SELECT 
    c.id as customer_id,
    c.store_id,
    c.full_name,
    c.phone,
    c.email,
    c.customer_type,
    c.loyalty_tier,
    c.total_debt,
    c.total_paid,
    -- Purchase metrics
    COUNT(s.id) as total_purchases,
    SUM(s.final_amount) as total_spent,
    AVG(s.final_amount) as average_order_value,
    MAX(s.transaction_date) as last_purchase_date,
    MIN(s.transaction_date) as first_purchase_date,
    DATEDIFF(DAY, MAX(s.transaction_date), GETDATE()) as days_since_last_purchase,
    -- Calculate customer lifetime value
    SUM(s.final_amount) - c.total_debt as customer_lifetime_value,
    -- RFM Analysis components
    DATEDIFF(DAY, MAX(s.transaction_date), GETDATE()) as recency,
    COUNT(s.id) as frequency,
    SUM(s.final_amount) as monetary
FROM Customers c
LEFT JOIN Sales s ON c.id = s.customer_id AND s.status IN ('pending', 'printed')
WHERE c.status = 'active'
GROUP BY 
    c.id, c.store_id, c.full_name, c.phone, c.email,
    c.customer_type, c.loyalty_tier, c.total_debt, c.total_paid;
GO

PRINT 'Advanced reporting views created successfully';
