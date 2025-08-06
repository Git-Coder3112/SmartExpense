import express from 'express'
import expenseCtrl from '../controllers/expense.controller'
import authCtrl from '../controllers/auth.controller'
import expenseCategorizer from '../ai/services/expenseCategorizer'

const router = express.Router()

router.route('/api/expenses/current/preview')
  .get(authCtrl.requireSignin, expenseCtrl.currentMonthPreview)

router.route('/api/expenses/by/category')
  .get(authCtrl.requireSignin, expenseCtrl.expenseByCategory)

router.route('/api/expenses/plot')
  .get(authCtrl.requireSignin, expenseCtrl.plotExpenses)

router.route('/api/expenses/category/averages')
  .get(authCtrl.requireSignin, expenseCtrl.averageCategories)

router.route('/api/expenses/yearly')
  .get(authCtrl.requireSignin, expenseCtrl.yearlyExpenses)

// AI Categorization endpoint
router.route('/api/expenses/ai/categorize')
  .post(authCtrl.requireSignin, async (req, res) => {
    try {
      const { title, amount } = req.body;
      
      if (!title) {
        return res.status(400).json({
          error: 'Title is required for categorization'
        });
      }
      
      const result = await expenseCategorizer.categorize(title, amount);
      res.json(result);
    } catch (error) {
      console.error('Error in AI categorization:', error);
      res.status(500).json({
        error: 'Failed to categorize expense'
      });
    }
  });

router.route('/api/expenses')
  .post(authCtrl.requireSignin, expenseCtrl.create)
  .get(authCtrl.requireSignin, expenseCtrl.listByUser)

router.route('/api/expenses/:expenseId')
  // .get(authCtrl.requireSignin, expenseCtrl.read)
  .put(authCtrl.requireSignin, expenseCtrl.hasAuthorization, expenseCtrl.update)
  .delete(authCtrl.requireSignin, expenseCtrl.hasAuthorization, expenseCtrl.remove)

router.param('expenseId', expenseCtrl.expenseByID)

export default router
