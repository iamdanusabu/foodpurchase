import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { format, parse } from 'date-fns';
import { Printer, RefreshCw, Calendar } from 'lucide-react';

interface FoodPurchase {
  id: number;
  date: string;
  breakfast: boolean;
  dinner: boolean;
  user_id: string;
}

const MEAL_PRICE = 40;
const TOTAL_BUDGET = 1000;

function FoodPurchaseTracker() {
  const [foodPurchases, setFoodPurchases] = useState<FoodPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate totals
  const totalCheckboxCount = foodPurchases.reduce((total, purchase) => 
    total + (purchase.breakfast ? 1 : 0) + (purchase.dinner ? 1 : 0), 0
  );
  const totalPrice = totalCheckboxCount * MEAL_PRICE;
  const moneyRemaining = TOTAL_BUDGET - totalPrice;

  useEffect(() => {
    fetchFoodPurchases();
  }, []);

  const fetchFoodPurchases = async () => {
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error fetching user:', userError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('food_purchases')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching food purchases:', error);
    } else if (data && data.length > 0) {
      setFoodPurchases(data);
      setStartDate(data[0].date);
      setEndDate(data[data.length - 1].date);
    }
    setLoading(false);
  };

  const handleCheckboxChange = async (
    index: number,
    meal: 'breakfast' | 'dinner'
  ) => {
    const updatedPurchases = [...foodPurchases];
    const purchase = updatedPurchases[index];
    purchase[meal] = !purchase[meal];
    setFoodPurchases(updatedPurchases);

    const { error } = await supabase
      .from('food_purchases')
      .update({ [meal]: purchase[meal] })
      .eq('id', purchase.id);

    if (error) {
      console.error('Error updating food purchase:', error);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset all fields? This action cannot be undone.'
      )
    ) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Reset all records to false
        const { error } = await supabase
          .from('food_purchases')
          .update({ breakfast: false, dinner: false })
          .eq('user_id', userData.user.id);

        if (error) {
          console.error('Error resetting food purchases:', error);
        } else {
          await fetchFoodPurchases(); // Refetch the data after reset
        }
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Food Purchase Tracker</h1>
      
      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Meals Selected</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalCheckboxCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <h2 className="text-sm font-medium text-gray-500 uppercase">Total Price</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{totalPrice}</p>
          <p className="text-sm text-gray-500">@₹{MEAL_PRICE} per meal</p>
        </div>
        <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${moneyRemaining >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <h2 className="text-sm font-medium text-gray-500 uppercase">Budget Remaining</h2>
          <p className={`mt-2 text-3xl font-bold ${moneyRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{moneyRemaining}
          </p>
          <p className="text-sm text-gray-500">of ₹{TOTAL_BUDGET} budget</p>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700">
          Showing data from {format(parse(startDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')} 
          to {format(parse(endDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
        </p>
      </div>

      {/* Warning message when over budget */}
      {moneyRemaining < 0 && (
        <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Budget Exceeded
              </h3>
              <p className="mt-2 text-sm text-red-700">
                You have exceeded your budget by ₹{Math.abs(moneyRemaining)}. Consider reducing your meal selections.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Breakfast
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dinner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {foodPurchases.map((purchase, index) => (
              <tr key={purchase.date}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(parse(purchase.date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={purchase.breakfast}
                    onChange={() => handleCheckboxChange(index, 'breakfast')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={purchase.dinner}
                    onChange={() => handleCheckboxChange(index, 'dinner')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(purchase.breakfast ? 1 : 0) + (purchase.dinner ? 1 : 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {foodPurchases.filter(p => p.breakfast).length}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {foodPurchases.filter(p => p.dinner).length}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {totalCheckboxCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={handleReset}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </button>
        <button
          onClick={handlePrint}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </button>
      </div>
    </div>
  );
}

export default FoodPurchaseTracker;