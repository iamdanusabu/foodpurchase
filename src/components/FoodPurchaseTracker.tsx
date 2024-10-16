import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { format, parse, eachDayOfInterval } from 'date-fns';
import { Printer, RefreshCw } from 'lucide-react';

interface FoodPurchase {
  id: number;
  date: string;
  breakfast: boolean;
  dinner: boolean;
  user_id: string;
}

function FoodPurchaseTracker() {
  const [startDate, setStartDate] = useState(() => localStorage.getItem('startDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('endDate') || '');
  const [foodPurchases, setFoodPurchases] = useState<FoodPurchase[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      localStorage.setItem('startDate', startDate);
      localStorage.setItem('endDate', endDate);
      fetchFoodPurchases();
    }
  }, [startDate, endDate]);

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
      const dates = eachDayOfInterval({
        start: parse(startDate, 'yyyy-MM-dd', new Date()),
        end: parse(endDate, 'yyyy-MM-dd', new Date()),
      });

      const purchases = dates.map((date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const existingPurchase = data?.find((p) => p.date === formattedDate);
        return (
          existingPurchase || {
            id: 0,
            date: formattedDate,
            breakfast: false,
            dinner: false,
            user_id: userData.user.id,
          }
        );
      });

      setFoodPurchases(purchases);
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

    if (purchase.id === 0) {
      const { data, error } = await supabase
        .from('food_purchases')
        .insert({ 
          date: purchase.date, 
          [meal]: purchase[meal],
          user_id: purchase.user_id
        })
        .select();
      if (error) {
        console.error('Error inserting food purchase:', error);
      } else if (data) {
        purchase.id = data[0].id;
      }
    } else {
      const { error } = await supabase
        .from('food_purchases')
        .update({ [meal]: purchase[meal] })
        .eq('id', purchase.id);
      if (error) {
        console.error('Error updating food purchase:', error);
      }
    }
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all fields? This action cannot be undone.'
      )
    ) {
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
      <div className="mb-4 flex flex-wrap gap-4">
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
      </div>
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
                {totalBreakfasts}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {totalDinners}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {totalMeals}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </button>
      </div>
    </div>
  );
}

export default FoodPurchaseTracker;