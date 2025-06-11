const Payment = require('../models/Payment')
const Group = require('../models/Group')

module.exports = async (req, res) => {
  try {
    const { reference, status, transactionRef } = req.body

    if (!reference || !transactionRef || status !== 'successful') {
      return res.status(400).json({ message: 'Invalid verification data' })
    }

    // Find the payment by reference
    const payment = await Payment.findOne({ reference })

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' })
    }

    // Update the payment status
    payment.status = 'paid'
    payment.transactionRef = transactionRef
    payment.paidAt = new Date()
    await payment.save()

    // Mark user as subscribed to the group
    if (payment.telegramId && payment.group) {
      await Group.updateOne(
        { _id: payment.group },
        {
          $addToSet: { subscribedUsers: payment.telegramId },
        }
      )
    }

    return res.status(200).json({ message: 'Payment verified and recorded', payment })
  } catch (err) {
    console.error('Error verifying payment:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
