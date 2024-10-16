import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { format, parse, eachDayOfInterval } from 'date-fns';
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
  const [startDate, setStartDate] = useState(() => localStorage.getItem('startDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('endDate') || '');
  const [foodPurchases, setFoodPurchases] = useState<FoodPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const totalCheckboxCount = foodPurchases.reduce((total, purchase) => 
    total + (purchase.breakfast ? 1 : 0) + (purchase.dinner ? 1 : 0), 0
  );
  const totalPrice = totalCheckboxCount * MEAL_PRICE;
  const moneyRemaining = TOTAL_BUDGET - totalPrice;

  // Rest of the existing hooks and functions remain the same...
  useEffect(() => {
    const loadInitialData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (startDate && endDate && userData.user) {
        const { data } = await supabase
          .from('food_purchases')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('date', { ascending: true });

        if (data) {
          setFoodPurchases(data);
        }
      }
    };

    loadInitialData();
  }, []);


  const ensureDateRangeInDB = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      setLoading(false);
      return;
    }

    // Get all dates in the range
    const dates = eachDayOfInterval({
      start: parse(startDate, 'yyyy-MM-dd', new Date()),
      end: parse(endDate, 'yyyy-MM-dd', new Date()),
    });

    // Get existing records for this date range
    const { data: existingData } = await supabase
      .from('food_purchases')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('user_id', userData.user.id);

    // Find dates that don't have records
    const existingDates = new Set(existingData?.map(d => d.date) || []);
    const newDates = dates.filter(date => 
      !existingDates.has(format(date, 'yyyy-MM-dd'))
    );

    // Create new records for missing dates
    if (newDates.length > 0) {
      const newRecords = newDates.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        breakfast: false,
        dinner: false,
        user_id: userData.user.id
      }));

      const { error } = await supabase
        .from('food_purchases')
        .insert(newRecords);

      if (error) {
        console.error('Error inserting new records:', error);
        alert('Error creating new records');
      }
    }

    // Fetch all records again
    await fetchFoodPurchases();
    setLoading(false);
  };

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
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('user_id', userData.user.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching food purchases:', error);
    } else {
      setFoodPurchases(data || []);
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
        // Delete all records in the date range
        await supabase
          .from('food_purchases')
          .delete()
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('user_id', userData.user.id);
      }

      setStartDate('');
      setEndDate('');
      setFoodPurchases([]);
      localStorage.removeItem('startDate');
      localStorage.removeItem('endDate');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalBreakfasts = foodPurchases.filter((p) => p.breakfast).length;
  const totalDinners = foodPurchases.filter((p) => p.dinner).length;
  const totalMeals = totalBreakfasts + totalDinners;
return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Food Purchase Tracker</h1>
      
      {/* New Summary Cards Section */}
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

      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <button
          onClick={ensureDateRangeInDB}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {loading ? 'Processing...' : 'Select Date Range'}
        </button>
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