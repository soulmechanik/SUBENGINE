const Payment = require('../models/payment')
const Group = require('../models/Group')

module.exports = async (req, res) => {
  try {
    const { reference, status, transactionRef } = req.body

    if (!status || status !== 'successful') {
      return res.status(400).json({ message: 'Invalid verification data' })
    }

    let payment = null

    if (reference) {
      payment = await Payment.findOne({ reference })
    }

    // fallback to transactionRef
    if (!payment && transactionRef) {
      payment = await Payment.findOne({ transactionRef })
    }

    // fallback to metadata.pay_ref
    if (!payment && transactionRef) {
      payment = await Payment.findOne({ 'metadata.pay_ref': transactionRef })
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' })
    }

    // Update the payment
    payment.status = 'paid'
    if (transactionRef) payment.transactionRef = transactionRef
    payment.paidAt = new Date()
    await payment.save()

    // Mark user as subscribed
    if (payment.telegramId && payment.group) {
      await Group.updateOne(
        { groupId: payment.group },
        { $addToSet: { subscribedUsers: payment.telegramId } }
      )
    }

    return res.status(200).json({ message: 'Payment verified and recorded', payment })
  } catch (err) {
    console.error('Error verifying payment:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
