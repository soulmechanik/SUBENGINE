const Payment = require('../models/payment');
const Group = require('../models/Group');
const User = require('../models/User');

// 🧮 1. Weekly Revenue Per Group Owner
exports.getWeeklyRevenuePerGroupOwner = async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const revenue = await Payment.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: { $gte: last7Days },
        },
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: 'groupId',
          as: 'groupData',
        },
      },
      { $unwind: '$groupData' },
      {
        $group: {
          _id: '$groupData.owner',
          totalRevenue: { $sum: '$netAmount' },
          groups: { $addToSet: '$groupData.groupTitle' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'ownerData',
        },
      },
      { $unwind: '$ownerData' },
      {
        $project: {
          _id: 0,
          telegramId: '$ownerData.telegramId',
          username: '$ownerData.username',
          email: '$ownerData.email',
          totalRevenue: 1,
          groups: 1,
        },
      },
    ]);

    res.json({ revenue });
  } catch (err) {
    console.error('❌ Revenue error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📊 2. Platform Stats: Total groups & group owners
exports.getPlatformStats = async (req, res) => {
  try {
    const [totalGroups, totalGroupOwners] = await Promise.all([
      Group.countDocuments(),
      User.countDocuments({ isGroupOwner: true }),
    ]);

    res.json({ totalGroups, totalGroupOwners });
  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 💳 3. Get all transactions (with optional status filter)
exports.getAllTransactions = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    // 1. Fetch payments based on query (e.g., status = "paid")
    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // 2. Extract all unique groupIds from transactions
    const groupIds = [...new Set(transactions.map(tx => tx.group))];

    // 3. Fetch matching groups by groupId
    const groups = await Group.find({ groupId: { $in: groupIds } }).lean();

    // 4. Create a lookup map of groupId => groupTitle
    const groupMap = new Map(groups.map(g => [g.groupId, g.groupTitle]));

    // 5. Attach groupTitle to each transaction
    const transactionsWithGroupTitle = transactions.map(tx => ({
      ...tx,
      groupTitle: groupMap.get(tx.group) || 'Unknown Group',
    }));

    res.json({ transactions: transactionsWithGroupTitle });
  } catch (err) {
    console.error('❌ Transactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.getAllGroupsWithInsights = async (req, res) => {
  try {
    const groups = await Group.find().lean();

    // Loop through each group and enrich it with owner & revenue data
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        // Get owner info
        const owner = await User.findById(group.owner).lean();

        // Count subscribers
        const totalSubscribers = group.subscribedUsers.length;

        // Calculate total revenue from successful payments linked to this group
        const payments = await Payment.find({ group: group.groupId, status: 'paid' });
        const totalRevenue = payments.reduce((sum, p) => sum + (p.netAmount || 0), 0);

        return {
          groupId: group.groupId,
          groupTitle: group.groupTitle,
          subscriptionAmount: group.subscriptionAmount,
          subscriptionDuration: group.subscriptionDuration,
          isActive: group.isActive,
          createdAt: group.createdAt,
          inviteLink: group.inviteLink,
          subLink: group.subLink,

          totalSubscribers,
          totalRevenue,

          owner: {
            telegramId: owner?.telegramId || null,
            username: owner?.username || null,
            email: owner?.email || null,
          },
        };
      })
    );

    res.json({ groups: enrichedGroups });
  } catch (err) {
    console.error('❌ Groups insight error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
