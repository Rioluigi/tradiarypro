-- ============================================
-- SQL RPC Function: Update account balance
-- ============================================

CREATE OR REPLACE FUNCTION update_account_balance(
  account_id UUID,
  profit DECIMAL,
  commission DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts
  SET 
    balance = balance + profit + COALESCE(commission, 0.00),
    updated_at = now()
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
