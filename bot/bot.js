const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');
const { setupGroupAccessHandlers } = require('./handlers/groupAccessHandler');
const myChatMemberHandler = require('./handlers/myChatMember');
const { getBankList, resolveAccount } = require('../backend/utils/paystack');
const User = require('../backend/models/User');
const Group = require('../backend/models/Group');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const checkSubscriptions = require('../backend/utils/subscriptionChecker');
const sessions = {};
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Session middleware
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!sessions[userId]) sessions[userId] = {};
  ctx.session = sessions[userId];
  console.log('Session for user:', userId, ctx.session);
  return next();
});

// Helper function to generate subscription link
function generateSubscriptionLink(groupId) {
  return `https://t.me/${process.env.BOT_USERNAME}?start=subscribe_${groupId}`;
}








// Helper function to create group invite link and save to DB
async function createAndSaveGroupInviteLink(ctx, groupId) {
  try {
    // Create new invite link
    const inviteLink = await ctx.telegram.createChatInviteLink(groupId, {
      creates_join_request: true,
    });
    
    // Update group in DB with invite link
    await Group.findOneAndUpdate(
      { groupId },
      { inviteLink: inviteLink.invite_link }
    );
    
    return inviteLink.invite_link;
  } catch (err) {
    console.error('Error creating/saving invite link:', err);
    return null;
  }
}

// Helper function to show group list
async function showGroupList(ctx) {
  const telegramId = String(ctx.from.id);

  const groups = await Group.find({}).populate('owner');
  const userGroups = groups.filter(
    (g) => g.owner && String(g.owner.telegramId) === telegramId
  );

  if (userGroups.length === 0) {
    return ctx.reply("⚠️ You haven't added me to any groups yet. Please add me to a group as admin first.");
  }

  const buttons = userGroups.map((group) => [
    {
      text: group.groupTitle,
      callback_data: `settings_group_${group.groupId}`,
    },
  ]);

  ctx.session.step = 'awaiting_group_selection';

  return ctx.reply('🔧 Please select a group to configure settings for:', {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

// ===================== COMMAND HANDLERS ===================== //

bot.start(async (ctx) => {
  // Handle subscription deep link
  if (ctx.startPayload && ctx.startPayload.startsWith('subscribe_')) {
    const groupId = ctx.startPayload.replace('subscribe_', '');
    const group = await Group.findOne({ groupId });
    
    if (!group) {
      return ctx.reply('❌ The subscription link is invalid. The group may no longer exist.');
    }

    // Store subscriber info in session
    ctx.session.subscriber = {
      telegramId: ctx.from.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name
    };
    
    ctx.session.subscribingGroupId = groupId;
    ctx.session.step = 'awaiting_subscription_confirmation';

   return ctx.reply(
  `📋 *Group Subscription Details:*\n\n` +
  `🏷️ *Name:* ${group.groupTitle}\n` +
  `💰 *Subscription:* ₦${group.subscriptionAmount} / ${group.subscriptionDuration}\n\n` +
  `Would you like to proceed with your subscription?\n\n` +
  `🚨 *Please Note:*\n` +
  `- No refunds. All purchases are final.\n` +
  `- Digital access is granted immediately upon payment.\n` +
  `- Use of fraudulent cards will lead to a permanent ban from all groups.\n` +
  `- Access will be revoked automatically if your payment fails or expires.\n\n` +
  `📩 For any assistance, contact:\n` +
  `- Email: subchatpro@gmail.com\n` +
  `- Telegram: @SE_support_subengine`,
  {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Yes, Subscribe', callback_data: 'confirm_subscription' },
          { text: '❌ No, Cancel', callback_data: 'cancel_subscription' }
        ]
      ]
    }
  }
);

  }

  // Normal start command
  if (ctx.chat.type !== 'private') return;

  const telegramId = ctx.from.id.toString();
  const existingUser = await User.findOne({ telegramId });

  if (existingUser && existingUser.email && typeof existingUser.isGroupOwner === 'boolean') {
    if (existingUser.isGroupOwner) {
    return ctx.reply(
  `👋 Welcome back, Group Owner!\n\nTo manage your groups, use the /configure command.\n\n📌 Don’t forget to add this bot to any group you'd like to manage — and make sure to grant it admin rights so it can function properly.`
);

    } else {
      return ctx.reply("👋 Welcome back! We'll notify you when groups become available for subscription.");
    }
  }

  if (existingUser) {
    await User.deleteOne({ telegramId });
  }

  ctx.session.step = 'awaiting_role';
  return ctx.reply(
    '👋 Welcome to SubEngine!\n\nAre you a group owner or a subscriber?',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Group Owner', callback_data: 'role_group_owner' },
            { text: 'Subscriber', callback_data: 'role_subscriber' }
          ]
        ]
      }
    }
  );
});

bot.command('configure', async (ctx) => {
  return showGroupList(ctx);
});

// ===================== CALLBACK QUERY HANDLERS ===================== //

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const telegramId = ctx.from.id.toString();

  await ctx.answerCbQuery();

  // Subscription confirmation handler
  if (data === 'confirm_subscription') {
    const groupId = ctx.session.subscribingGroupId;
    const group = await Group.findOne({ groupId });
    
    if (!group) {
      return ctx.reply('❌ The group no longer exists. Please contact support.');
    }

    // Create or update subscriber record
    const subscriber = await User.findOneAndUpdate(
      { telegramId },
      {
        telegramId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        isGroupOwner: false
      },
      { upsert: true, new: true }
    );

    // Prepare payment URL with required parameters (excluding bank details)
    const paymentUrl = new URL(`${frontendUrl}/subscribe`);
    paymentUrl.searchParams.append('groupId', groupId);
    paymentUrl.searchParams.append('userId', telegramId);
    paymentUrl.searchParams.append('amount', group.subscriptionAmount);
    paymentUrl.searchParams.append('duration', group.subscriptionDuration);
    paymentUrl.searchParams.append('groupName', group.groupTitle);

    return ctx.reply(
      `✅ Redirecting to payment for ${group.groupTitle}...\n\n` +
      `Please complete your subscription at: ${paymentUrl.toString()}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Visit Payment Page', url: paymentUrl.toString() }],
            [{ text: '🏠 Go Back Home', callback_data: 'go_back_home' }]
          ]
        }
      }
    );
  }

  // Subscription cancellation handler
  if (data === 'cancel_subscription') {
    ctx.session = {};
    return ctx.reply(
      '❌ Subscription cancelled.\n\n' +
      'You can use /start to browse other groups or try again later.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Start Over', callback_data: 'go_back_home' }]
          ]
        }
      }
    );
  }

  // Role selection handler
  if (data === 'role_group_owner' || data === 'role_subscriber') {
    ctx.session.isGroupOwner = data === 'role_group_owner';
    ctx.session.step = 'awaiting_email';
    return ctx.reply('📧 Please enter your email address:');
  }

  // Group selection handler
  if (data.startsWith('settings_group_')) {
    const groupId = data.replace('settings_group_', '');
    const group = await Group.findOne({ groupId });
    
    if (!group) {
      return ctx.reply('❌ Group not found. Please try again.');
    }

    // Show group details with edit button
    let message = `📋 Group Details:\n\n` +
                  `🏷️ Name: ${group.groupTitle}\n` +
                  `💰 Subscription Amount: ₦${group.subscriptionAmount || 'Not set'}\n`;
    
    if (group.subscriptionDuration) {
      message += `⏳ Duration: ${group.subscriptionDuration}\n`;
    }

    // Add subscription link if group is fully configured
    if (group.subscriptionAmount && group.subscriptionDuration && group.accountName) {
      const subLink = generateSubscriptionLink(group.groupId);
      await Group.findOneAndUpdate({ groupId }, { subLink });
      message += `\n🔗 Subscription Link:\n${subLink}`;
    }

    // Add invite link if available
    if (group.inviteLink) {
      message += `\n📨 Group Invite Link:\n${group.inviteLink}`;
    }

    ctx.session.selectedGroupId = groupId;

    return ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✏️ Edit Group Settings', callback_data: `edit_group_${groupId}` }],
          [{ text: '⬅️ Back to Groups', callback_data: 'back_to_groups' }]
        ]
      }
    });
  }

  // Edit group handler
  if (data.startsWith('edit_group_')) {
    const groupId = data.replace('edit_group_', '');
    ctx.session.selectedGroupId = groupId;
    ctx.session.step = 'awaiting_price';
    return ctx.reply('💰 How much should members pay to join this group? (in ₦)');
  }

  // Back to groups handler
  if (data === 'back_to_groups') {
    return showGroupList(ctx);
  }

  // Duration selection handler
  if (data.startsWith('duration_')) {
    const duration = data.replace('duration_', '');
    const groupId = ctx.session.selectedGroupId;

    await Group.findOneAndUpdate({ groupId }, { subscriptionDuration: duration });

    ctx.session.step = 'awaiting_bank_name';
    ctx.session.bankList = await getBankList();

    return ctx.reply(
      '🏦 Enter the *first 3 letters* of your bank name (e.g. "acc" for Access Bank):',
      { parse_mode: 'Markdown' }
    );
  }

  // Account confirmation handler
  if (data === 'account_confirm_yes') {
    const { verifiedAccount, selectedGroupId } = ctx.session;

    try {
      // Save bank details and generate subscription link
      const subLink = generateSubscriptionLink(selectedGroupId);
      
      // Create and save invite link
      const inviteLink = await createAndSaveGroupInviteLink(ctx, selectedGroupId);
      
      await Group.findOneAndUpdate(
        { groupId: selectedGroupId },
        {
          accountName: verifiedAccount.accountName,
          accountNumber: verifiedAccount.accountNumber,
          bankName: verifiedAccount.bankName,
          bankCode: verifiedAccount.bankCode,
          subLink,
          inviteLink
        }
      );

      const group = await Group.findOne({ groupId: selectedGroupId });
      
      ctx.session = {}; // Clear session

      return ctx.reply(
        `✅ Group configuration complete!\n\n` +
        `📋 Group Details:\n` +
        `🏷️ Name: ${group.groupTitle}\n` +
        `💰 Subscription Amount: ₦${group.subscriptionAmount}\n` +
        `⏳ Duration: ${group.subscriptionDuration}\n\n` +
        `🔗 Share this subscription link with your members:\n${subLink}\n\n` +
        `📨 Group Invite Link:\n${inviteLink}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Go Back Home', callback_data: 'go_back_home' }],
              [{ text: '⚙️ Configure Another Group', callback_data: 'back_to_groups' }]
            ]
          }
        }
      );
    } catch (err) {
      console.error(err);
      return ctx.reply('❌ Failed to save bank details. Please try again later.');
    }
  }

  // Go back home handler
  if (data === 'go_back_home') {
    ctx.session = {}; // Clear session
    return ctx.reply(
      '🏠 Welcome to SubEngine!\n\n' +
      'As a group owner, you can:\n' +
      '- Configure your groups\n' +
      '- Start a new session\n\n' +
      'What would you like to do?',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚙️ Configure Groups', callback_data: 'back_to_groups' }],
            [{ text: '🔄 Start New Session', callback_data: 'role_group_owner' }]
          ]
        }
      }
    );
  }

  // Account rejection handler
  if (data === 'account_confirm_no') {
    ctx.session.step = 'awaiting_account_number';
    return ctx.reply('🔄 Please enter your 10-digit account number again:');
  }

  // Bank search retry handler
  if (data === 'retry_bank_search') {
    ctx.session.step = 'awaiting_bank_name';
    return ctx.reply('🔍 Enter the first 3 letters of your bank name:');
  }

  // Show all banks handler
  if (data === 'show_all_banks') {
    const allBanks = ctx.session.bankList;
    const banksPerPage = 10;
    const totalPages = Math.ceil(allBanks.length / banksPerPage);
    ctx.session.bankPages = { currentPage: 0, totalPages };
    
    const pageBanks = allBanks.slice(0, banksPerPage);
    const bankButtons = pageBanks.map(bank => 
      [{ text: bank.name, callback_data: `select_bank_${bank.code}` }]
    );
    
    const paginationButtons = [];
    if (totalPages > 1) {
      paginationButtons.push(
        { text: '▶️ Next', callback_data: 'bank_page_next' }
      );
    }
    
    if (paginationButtons.length > 0) {
      bankButtons.push(paginationButtons);
    }
    
    ctx.session.step = 'awaiting_bank_selection';
    return ctx.editMessageText(
      '📋 All Available Banks:\n\nPlease select your bank:',
      {
        reply_markup: {
          inline_keyboard: bankButtons
        }
      }
    );
  }

  // Bank pagination handler
  if (data === 'bank_page_next' || data === 'bank_page_prev') {
    const { bankPages, bankList } = ctx.session;
    const banksPerPage = 10;
    let newPage = data === 'bank_page_next' 
      ? bankPages.currentPage + 1 
      : bankPages.currentPage - 1;
    
    newPage = Math.max(0, Math.min(newPage, bankPages.totalPages - 1));
    
    const startIdx = newPage * banksPerPage;
    const pageBanks = bankList.slice(startIdx, startIdx + banksPerPage);
    
    const bankButtons = pageBanks.map(bank => 
      [{ text: bank.name, callback_data: `select_bank_${bank.code}` }]
    );
    
    const paginationButtons = [];
    if (newPage > 0) {
      paginationButtons.push(
        { text: '◀️ Previous', callback_data: 'bank_page_prev' }
      );
    }
    if (newPage < bankPages.totalPages - 1) {
      paginationButtons.push(
        { text: '▶️ Next', callback_data: 'bank_page_next' }
      );
    }
    
    if (paginationButtons.length > 0) {
      bankButtons.push(paginationButtons);
    }
    
    ctx.session.bankPages.currentPage = newPage;
    return ctx.editMessageReplyMarkup({
      inline_keyboard: bankButtons
    });
  }

  // Bank selection handler
  if (data.startsWith('select_bank_')) {
    const bankCode = data.replace('select_bank_', '');
    const selectedBank = ctx.session.bankList.find(b => b.code === bankCode);
    
    if (!selectedBank) {
      return ctx.reply('❌ Invalid bank selection. Please try again.');
    }
    
    ctx.session.selectedBank = selectedBank;
    ctx.session.step = 'awaiting_account_number';
    return ctx.reply(
      `✅ Selected ${selectedBank.name}\n\n` +
      '🔢 Please enter your 10-digit account number:'
    );
  }

  // Account number retry handler
  if (data === 'retry_account_number') {
    ctx.session.step = 'awaiting_account_number';
    return ctx.reply('🔢 Please enter your 10-digit account number again:');
  }

  // Change bank handler
  if (data === 'change_bank') {
    ctx.session.step = 'awaiting_bank_name';
    return ctx.reply('🏦 Enter the first 3 letters of your bank name:');
  }
});

// ===================== TEXT MESSAGE HANDLERS ===================== //

bot.on('text', async (ctx) => {
  const { step, selectedGroupId, bankList } = ctx.session;
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username?.toLowerCase();
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;
  const input = ctx.message.text.trim();

  // Email input handler
  if (step === 'awaiting_email') {
    const email = input.toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!valid) return ctx.reply('❌ Please enter a valid email address.');

    await User.create({
      telegramId,
      username,
      firstName,
      lastName,
      email,
      isGroupOwner: ctx.session.isGroupOwner
    });

    ctx.session.step = null;

    if (ctx.session.isGroupOwner) {
      return ctx.reply(
        "✅ You're registered as a Group Owner!\n\nPlease add me to your group as an *admin* and then use /configure to set it up.",
        { parse_mode: 'Markdown' }
      );
    } else {
      return ctx.reply(
        "✅ You're registered as a Subscriber!\n\nWe'll notify you when groups are available for subscription."
      );
    }
  }

  // Price input handler
  if (step === 'awaiting_price') {
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Please enter a valid amount in ₦.');
    }

    const group = await Group.findOneAndUpdate(
      { groupId: selectedGroupId },
      { subscriptionAmount: amount },
      { new: true }
    );
    
    ctx.session.selectedGroupTitle = group.groupTitle;
    ctx.session.step = 'awaiting_duration';

    return ctx.reply('⏳ Select subscription duration:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Monthly', callback_data: 'duration_monthly' },
            { text: 'Quarterly', callback_data: 'duration_quarterly' },
          ],
          [
            { text: 'Bi-Annually', callback_data: 'duration_biannually' },
            { text: 'Annually', callback_data: 'duration_annually' },
          ],
        ],
      },
    });
  }

  // Bank name input handler
  if (step === 'awaiting_bank_name') {
    const search = input.substring(0, 3).toLowerCase();
    
    if (!/^[a-z]{3}$/i.test(search)) {
      return ctx.reply('❌ Please enter at least 3 letters of your bank name');
    }

    const matchedBanks = bankList.filter(bank => 
      bank.name.toLowerCase().startsWith(search)
    );

    if (matchedBanks.length === 0) {
      return ctx.reply(
        '🔍 No banks found starting with "' + search + '".\n\n' +
        'Please try different initials or check your spelling.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '↩️ Try Different Letters', callback_data: 'retry_bank_search' }],
              [{ text: '📋 See All Banks', callback_data: 'show_all_banks' }]
            ]
          }
        }
      );
    }

    if (matchedBanks.length === 1) {
      ctx.session.selectedBank = matchedBanks[0];
      ctx.session.step = 'awaiting_account_number';
      return ctx.reply(
        `✅ Selected ${matchedBanks[0].name}\n\n` +
        '🔢 Please enter your 10-digit account number:'
      );
    }

    ctx.session.matchedBanks = matchedBanks;
    ctx.session.step = 'awaiting_bank_selection';

    const bankButtons = matchedBanks.map(bank => 
      [{ text: bank.name, callback_data: `select_bank_${bank.code}` }]
    );

    bankButtons.push([
      { text: '🔍 Search Again', callback_data: 'retry_bank_search' },
      { text: '📋 All Banks', callback_data: 'show_all_banks' }
    ]);

    return ctx.reply(
      `🏦 Found ${matchedBanks.length} banks starting with "${search}":\n\n` +
      'Please select your bank:',
      {
        reply_markup: {
          inline_keyboard: bankButtons
        }
      }
    );
  }

  // Account number input handler
  if (step === 'awaiting_account_number') {
    const accountNumber = input;
    const { code: bankCode, name: bankName } = ctx.session.selectedBank;

    if (!/^\d{10}$/.test(accountNumber)) {
      return ctx.reply('❌ Invalid account number. Please enter a 10-digit number.');
    }

    try {
      // Verify account with Paystack
      const resolved = await resolveAccount({ 
        account_number: accountNumber, 
        bank_code: bankCode 
      });
      
      if (!resolved || !resolved.account_name) {
        throw new Error('Account verification failed');
      }

      ctx.session.verifiedAccount = {
        accountName: resolved.account_name,
        accountNumber,
        bankName,
        bankCode
      };
      ctx.session.step = 'awaiting_account_confirmation';

      return ctx.reply(
        `🔍 Account Verified!\n\n` +
        `🏦 Bank: ${bankName}\n` +
        `👤 Account Name: ${resolved.account_name}\n` +
        `🔢 Account Number: ${accountNumber}\n\n` +
        `Is this correct?`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, Proceed', callback_data: 'account_confirm_yes' },
                { text: '❌ No, Try Again', callback_data: 'account_confirm_no' }
              ]
            ]
          }
        }
      );
    } catch (err) {
      console.error(err);
      return ctx.reply(
        '❌ Account verification failed. Please:\n' +
        '1. Double-check your account number\n' +
        '2. Ensure the bank is correct\n' +
        '3. Try again',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '↩️ Re-enter Account Number', callback_data: 'retry_account_number' },
                { text: '🏦 Change Bank', callback_data: 'change_bank' }
              ]
            ]
          }
        }
      );
    }
  }
});





// ===================== EVENT HANDLERS ===================== //

bot.on('my_chat_member', async (ctx) => {
  try {
    const chatMember = ctx.myChatMember;
    const chat = chatMember.chat;
    const newStatus = chatMember.new_chat_member.status;
    const oldStatus = chatMember.old_chat_member.status;

    // Only proceed if the bot was added to a group (not private chat)
    if (chat.type === 'private') return;

    // Check if the bot was promoted to admin (from non-admin)
    if (newStatus === 'administrator' && oldStatus !== 'administrator') {
      const userId = String(chatMember.from.id);
      const user = await User.findOne({ telegramId: userId, isGroupOwner: true });

      if (!user) {
        console.log(`User ${userId} is not a registered group owner`);
        return;
      }

      // Check if group already exists
      const existingGroup = await Group.findOne({ groupId: String(chat.id) });
      if (existingGroup) {
        console.log(`Group ${chat.id} already exists in database`);
        return;
      }

      // Create new group record
      const newGroup = new Group({
        groupId: String(chat.id),
        groupTitle: chat.title,
        owner: user._id,
        subscriptionAmount: 0,
        subscriptionDuration: 'monthly', // Set default value
        accountName: '',
        accountNumber: '',
        bankName: '',
        bankCode: '',
        subLink: '',
        inviteLink: ''
      });

      await newGroup.save();

      // Create and save invite link
      const inviteLink = await createAndSaveGroupInviteLink(ctx, String(chat.id));
      await Group.findOneAndUpdate(
        { groupId: String(chat.id) },
        { inviteLink }
      );

      console.log(`New group created: ${chat.title} (${chat.id})`);

      // Send confirmation message to group owner
      try {
        await ctx.telegram.sendMessage(
          userId,
          `✅ Successfully added to group: ${chat.title}\n\n` +
          `You can now configure your group settings to start accepting payments.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚙️ Configure Group', callback_data: 'back_to_groups' }]
              ]
            }
          }
        );
      } catch (error) {
        console.error('Failed to send confirmation message:', error);
      }
    }

    // Check if the bot was removed from admin or kicked from group
    if ((newStatus === 'member' && oldStatus === 'administrator') || 
        newStatus === 'kicked' || newStatus === 'left') {
      // Remove group from database
      await Group.deleteOne({ groupId: String(chat.id) });
      console.log(`Group ${chat.id} removed from database`);
    }
  } catch (err) {
    console.error('Error in my_chat_member handler:', err);
  }
});




setupGroupAccessHandlers(bot);

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  return ctx.reply('❌ An error occurred. Please try again later.');
});

bot.use((ctx, next) => {
  console.log('📦 Received update:', ctx.updateType);
  return next();
});


module.exports = bot;