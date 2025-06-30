import { storage } from "./storage";

/**
 * Generates a unique 6-character referral code
 */
export async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existingUser = await storage.getUserByReferralCode(code);
    if (!existingUser) {
      return code;
    }
    
    attempts++;
  }

  throw new Error('Unable to generate unique referral code');
}

/**
 * Tracks a referral when a new user signs up with a referral code
 */
export async function trackReferral(referralCode: string, newUserId: string): Promise<void> {
  // Find the referrer by their referral code
  const referrer = await storage.getUserByReferralCode(referralCode);
  if (!referrer) {
    throw new Error('Invalid referral code');
  }

  // Prevent self-referral
  if (referrer.id === newUserId) {
    throw new Error('Cannot refer yourself');
  }

  // Check if this user was already referred
  const existingReferral = await storage.getReferralByReferee(newUserId);
  if (existingReferral) {
    throw new Error('User has already been referred');
  }

  // Create the referral record
  await storage.createReferral({
    referrerId: referrer.id,
    refereeId: newUserId,
    referralCode: referralCode,
    status: 'pending',
    rewardClaimed: false,
  });

  // Update the new user's referredBy field
  await storage.updateUserReferredBy(newUserId, referralCode);
}

/**
 * Checks if a referee has reached the 2-month subscription milestone
 */
export async function checkSubscriptionMilestone(userId: string): Promise<boolean> {
  const subscription = await storage.getUserSubscription(userId);
  if (!subscription) {
    return false;
  }

  // Check if user has paid for at least 2 months
  return subscription.monthsPaid >= 2;
}

/**
 * Grants a free month to the referrer when milestone is reached
 */
export async function grantFreeMonth(referrerId: string): Promise<void> {
  // Update referrer's free months
  await storage.incrementUserFreeMonths(referrerId);

  // Update referrer's subscription if they have one
  const subscription = await storage.getUserSubscription(referrerId);
  if (subscription) {
    await storage.addFreeMonthToSubscription(subscription.id);
  }
}

/**
 * Processes referral reward when referee reaches 2-month milestone
 */
export async function processReferralReward(refereeId: string): Promise<void> {
  const referral = await storage.getReferralByReferee(refereeId);
  if (!referral || referral.status !== 'pending') {
    return;
  }

  // Check if milestone is reached
  const milestoneReached = await checkSubscriptionMilestone(refereeId);
  if (!milestoneReached) {
    return;
  }

  // Update referral status to qualified
  await storage.updateReferralStatus(referral.id, 'qualified', new Date());

  // Grant free month to referrer
  await grantFreeMonth(referral.referrerId);

  // Mark reward as claimed
  await storage.updateReferralRewardClaimed(referral.id, new Date());
}

/**
 * Gets referral statistics for a user
 */
export async function getUserReferralStats(userId: string): Promise<{
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  freeMonthsEarned: number;
  referralCode: string;
}> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const referrals = await storage.getUserReferrals(userId);
  
  const totalReferrals = referrals.length;
  const qualifiedReferrals = referrals.filter(r => r.status === 'qualified' || r.status === 'rewarded').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;

  return {
    totalReferrals,
    qualifiedReferrals,
    pendingReferrals,
    freeMonthsEarned: user.freeMonthsEarned || 0,
    referralCode: user.referralCode || '',
  };
}

/**
 * Creates a shareable referral URL
 */
export function createReferralUrl(referralCode: string, baseUrl: string = ''): string {
  const domain = baseUrl || process.env.REPLIT_DOMAINS?.split(',')[0] || 'yourapp.replit.app';
  return `https://${domain}/join?ref=${referralCode}`;
}