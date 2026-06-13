-- Free
UPDATE user_profiles 
SET subscription_tier = 'free', stripe_customer_id = null 
WHERE id = 'bde71604-8cff-4b16-b2f7-4bf7b20ecb86';

-- Starter
UPDATE user_profiles 
SET subscription_tier = 'starter'
WHERE id = 'bde71604-8cff-4b16-b2f7-4bf7b20ecb86';

-- Pro
UPDATE user_profiles 
SET subscription_tier = 'pro'
WHERE id = 'bde71604-8cff-4b16-b2f7-4bf7b20ecb86';

-- Unlimited
UPDATE user_profiles 
SET subscription_tier = 'unlimited'
WHERE id = 'bde71604-8cff-4b16-b2f7-4bf7b20ecb86';