import { Transaction } from './mockData';
import { format, startOfMonth, subMonths, isAfter, differenceInDays, addMonths, parseISO } from 'date-fns';

export const calculateKPIs = (data: Transaction[]) => {
  if (data.length === 0) return { totalRevenue: 0, totalCost: 0, totalProfit: 0, avgOrderValue: 0, profitMargin: 0, totalOrders: 0, totalCustomers: 0 };
  const totalRevenue = data.reduce((sum, t) => sum + t.revenue, 0);
  const totalCost = data.reduce((sum, t) => sum + t.cost, 0);
  const totalProfit = data.reduce((sum, t) => sum + t.profit, 0);
  const avgOrderValue = totalRevenue / data.length;
  const profitMargin = (totalProfit / totalRevenue) * 100;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    avgOrderValue,
    profitMargin,
    totalOrders: data.length,
    totalCustomers: new Set(data.map(t => t.customerId)).size
  };
};

export const getMonthlyTrends = (data: Transaction[]) => {
  const monthlyData: Record<string, { revenue: number; profit: number; month: string; date: Date }> = {};

  data.forEach(t => {
    const d = typeof t.date === 'string' ? parseISO(t.date) : t.date;
    const monthKey = format(d, 'yyyy-MM');
    const displayKey = format(d, 'MMM yyyy');
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { revenue: 0, profit: 0, month: displayKey, date: d };
    }
    monthlyData[monthKey].revenue += t.revenue;
    monthlyData[monthKey].profit += t.profit;
  });

  return Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const getCategoryPerformance = (data: Transaction[]) => {
  const categoryData: Record<string, { name: string; revenue: number; profit: number }> = {};

  data.forEach(t => {
    if (!categoryData[t.category]) {
      categoryData[t.category] = { name: t.category, revenue: 0, profit: 0 };
    }
    categoryData[t.category].revenue += t.revenue;
    categoryData[t.category].profit += t.profit;
  });

  return Object.values(categoryData);
};

export const getRegionalPerformance = (data: Transaction[]) => {
  const regionalData: Record<string, { name: string; revenue: number; profit: number }> = {};

  data.forEach(t => {
    if (!regionalData[t.region]) {
      regionalData[t.region] = { name: t.region, revenue: 0, profit: 0 };
    }
    regionalData[t.region].revenue += t.revenue;
    regionalData[t.region].profit += t.profit;
  });

  return Object.values(regionalData);
};

export const getChurnAnalysis = (data: Transaction[]) => {
  const now = new Date();
  const churnThreshold = 90; // days
  const customerStats: Record<string, { lastDate: Date; totalSpent: number; orderCount: number }> = {};

  data.forEach(t => {
    const d = typeof t.date === 'string' ? parseISO(t.date) : t.date;
    if (!customerStats[t.customerId]) {
      customerStats[t.customerId] = { lastDate: d, totalSpent: 0, orderCount: 0 };
    }
    if (isAfter(d, customerStats[t.customerId].lastDate)) {
      customerStats[t.customerId].lastDate = d;
    }
    customerStats[t.customerId].totalSpent += t.revenue;
    customerStats[t.customerId].orderCount += 1;
  });

  const customers = Object.entries(customerStats).map(([id, stats]) => {
    const recency = differenceInDays(now, stats.lastDate);
    const frequency = stats.orderCount;
    const monetary = stats.totalSpent;

    // Churn Probability Score (0-100)
    let score = (recency / 365) * 70 + (1 / (frequency + 1)) * 15 + (1 / (monetary / 1000 + 1)) * 15;
    score = Math.min(100, Math.max(0, score * 100));

    return {
      id,
      score,
      isChurned: recency > churnThreshold,
      recency,
      frequency,
      monetary
    };
  });

  const totalCustomers = customers.length;
  const churnedCustomers = customers.filter(c => c.isChurned).length;

  return {
    churnRate: totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0,
    totalCustomers,
    churnedCustomers,
    activeCustomers: totalCustomers - churnedCustomers,
    highRiskCustomers: customers.filter(c => c.score > 70).sort((a, b) => b.score - a.score).slice(0, 10)
  };
};

export const getRevenueForecast = (monthlyTrends: any[]) => {
  if (monthlyTrends.length < 3) return monthlyTrends;
  
  const n = monthlyTrends.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = monthlyTrends.map(m => m.revenue);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const seasonalFactors = Array(12).fill(0);
  const seasonalCounts = Array(12).fill(0);

  monthlyTrends.forEach((m, i) => {
    const trendValue = slope * i + intercept;
    const ratio = m.revenue / trendValue;
    const monthIndex = m.date.getMonth();
    seasonalFactors[monthIndex] += ratio;
    seasonalCounts[monthIndex] += 1;
  });

  for (let i = 0; i < 12; i++) {
    if (seasonalCounts[i] > 0) {
      seasonalFactors[i] /= seasonalCounts[i];
    } else {
      seasonalFactors[i] = 1;
    }
  }

  const forecast = [];
  const lastDate = monthlyTrends[monthlyTrends.length - 1].date;

  for (let i = 1; i <= 6; i++) {
    const forecastX = n + i - 1;
    const forecastDate = addMonths(lastDate, i);
    const monthIndex = forecastDate.getMonth();
    
    const trendValue = slope * forecastX + intercept;
    const forecastY = trendValue * seasonalFactors[monthIndex];
    
    forecast.push({
      month: format(forecastDate, 'MMM yyyy'),
      revenue: forecastY,
      isForecast: true,
      date: forecastDate
    });
  }

  return [...monthlyTrends.slice(-6), ...forecast];
};
