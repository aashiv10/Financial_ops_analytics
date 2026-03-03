import { subDays, format, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, subMonths } from 'date-fns';

export interface Transaction {
  id: string;
  date: Date;
  customerId: string;
  customerName: string;
  category: 'Electronics' | 'Fashion' | 'Home & Kitchen' | 'Beauty' | 'Sports';
  region: 'North' | 'South' | 'East' | 'West' | 'Central';
  paymentMethod: 'Credit Card' | 'PayPal' | 'Bank Transfer' | 'Cash';
  revenue: number;
  cost: number;
  profit: number;
  discount: number;
  quantity: number;
}

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports'] as const;
const REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const;
const PAYMENT_METHODS = ['Credit Card', 'PayPal', 'Bank Transfer', 'Cash'] as const;
const CUSTOMER_NAMES = [
  'Acme Corp', 'Global Tech', 'Nexus Solutions', 'Stellar Industries', 'Quantum Systems',
  'Horizon Ventures', 'Pinnacle Group', 'Apex Dynamics', 'Summit Enterprises', 'Elite Services'
];

export const generateMockData = (count: number = 10000): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();
  const startDate = subMonths(now, 24); // 2 years of data

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
    
    // Base revenue by category
    let baseRevenue = 0;
    switch (category) {
      case 'Electronics': baseRevenue = 500 + Math.random() * 1500; break;
      case 'Fashion': baseRevenue = 50 + Math.random() * 300; break;
      case 'Home & Kitchen': baseRevenue = 100 + Math.random() * 600; break;
      case 'Beauty': baseRevenue = 30 + Math.random() * 200; break;
      case 'Sports': baseRevenue = 80 + Math.random() * 400; break;
    }

    // Add seasonality (higher in Q4)
    const month = date.getMonth();
    if (month >= 9) baseRevenue *= 1.3; 

    const quantity = Math.floor(Math.random() * 5) + 1;
    const revenue = baseRevenue * quantity;
    const discount = Math.random() < 0.3 ? revenue * (Math.random() * 0.2) : 0;
    const finalRevenue = revenue - discount;
    
    // Cost is usually 40-70% of revenue
    const costRatio = 0.4 + Math.random() * 0.3;
    const cost = revenue * costRatio;
    const profit = finalRevenue - cost;

    const customerIndex = Math.floor(Math.random() * CUSTOMER_NAMES.length);
    const customerId = `CUST-${customerIndex.toString().padStart(3, '0')}`;

    transactions.push({
      id: `TRX-${i.toString().padStart(6, '0')}`,
      date,
      customerId,
      customerName: CUSTOMER_NAMES[customerIndex],
      category,
      region,
      paymentMethod,
      revenue: finalRevenue,
      cost,
      profit,
      discount,
      quantity
    });
  }

  return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
};
