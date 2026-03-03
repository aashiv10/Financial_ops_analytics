import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  LayoutDashboard, TrendingUp, Users, PieChart as PieChartIcon, 
  AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight, 
  DollarSign, ShoppingBag, Globe, CreditCard, Calendar,
  ChevronRight, Download, Filter, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateMockData } from './data/mockData';
import { 
  calculateKPIs, getMonthlyTrends, getCategoryPerformance, 
  getRegionalPerformance, getChurnAnalysis, getRevenueForecast 
} from './data/analytics';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

import Papa from 'papaparse';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'customers' | 'forecast' | 'insights'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<any[]>(() => generateMockData(10000));
  const [isSyncing, setIsSyncing] = useState(false);
  
  const kpis = useMemo(() => calculateKPIs(data), [data]);
  const monthlyTrends = useMemo(() => getMonthlyTrends(data), [data]);
  const categoryData = useMemo(() => getCategoryPerformance(data), [data]);
  const regionalData = useMemo(() => getRegionalPerformance(data), [data]);
  const churnData = useMemo(() => getChurnAnalysis(data), [data]);
  const forecastData = useMemo(() => getRevenueForecast(monthlyTrends), [monthlyTrends]);

  const refreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setData(generateMockData(10000));
      setIsRefreshing(false);
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const parsedData = results.data.map((row: any) => ({
          ...row,
          date: row.date ? new Date(row.date) : new Date(),
          revenue: Number(row.revenue || 0),
          cost: Number(row.cost || 0),
          profit: Number(row.profit || (row.revenue - row.cost) || 0),
        })).filter((row: any) => row.id);
        
        setData(parsedData);
        syncToDB(parsedData);
      }
    });
  };

  const syncToDB = async (transactions: any[]) => {
    setIsSyncing(true);
    try {
      await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactions),
      });
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const exportReport = () => {
    // Generate CSV content
    const headers = ['ID', 'Date', 'Customer', 'Category', 'Region', 'Revenue', 'Cost', 'Profit', 'Discount'];
    const csvContent = [
      headers.join(','),
      ...data.map(t => [
        t.id,
        t.date instanceof Date ? t.date.toISOString() : t.date,
        t.customerName,
        t.category,
        t.region,
        t.revenue.toFixed(2),
        t.cost.toFixed(2),
        t.profit.toFixed(2),
        t.discount.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finops_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-50 hidden lg:flex flex-col">
        <div className="p-6 border-bottom border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <TrendingUp size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">FinOps Pro</h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Analytics</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'operations', label: 'Operations', icon: ShoppingBag },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'forecast', label: 'Forecasting', icon: TrendingUp },
            { id: 'insights', label: 'Insights', icon: PieChartIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs text-slate-400 font-medium mb-1">Current User</p>
              <p className="text-sm font-bold truncate">Senior Data Analyst</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8 pb-24">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Dashboard
            </h2>
            <p className="text-slate-500 text-sm">Real-time financial performance and operational insights.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
              <Download size={16} className="rotate-180" />
              Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            <button 
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button 
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </header>

        {/* Content Tabs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard 
                    title="Total Revenue" 
                    value={formatCurrency(kpis.totalRevenue)} 
                    trend="+12.5%" 
                    isPositive={true} 
                    icon={DollarSign}
                    color="emerald"
                  />
                  <KPICard 
                    title="Total Profit" 
                    value={formatCurrency(kpis.totalProfit)} 
                    trend="+8.2%" 
                    isPositive={true} 
                    icon={TrendingUp}
                    color="blue"
                  />
                  <KPICard 
                    title="Profit Margin" 
                    value={formatPercent(kpis.profitMargin)} 
                    trend="-1.2%" 
                    isPositive={false} 
                    icon={PieChartIcon}
                    color="amber"
                  />
                  <KPICard 
                    title="Total Customers" 
                    value={kpis.totalCustomers.toLocaleString()} 
                    trend="+4.3%" 
                    isPositive={true} 
                    icon={Users}
                    color="violet"
                  />
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ChartContainer title="Revenue & Profit Trends" subtitle="Monthly performance over the last 24 months">
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={monthlyTrends}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProf)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  <ChartContainer title="Revenue by Product Category" subtitle="Distribution of sales across departments">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} width={100} />
                        <Tooltip 
                          cursor={{fill: '#F1F5F9'}}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <ChartContainer title="Regional Revenue" subtitle="Sales performance by geographic area" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={regionalData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  <ChartContainer title="Payment Methods" subtitle="Preferred customer transaction types">
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Credit Card', value: 45 },
                            { name: 'PayPal', value: 25 },
                            { name: 'Bank Transfer', value: 20 },
                            { name: 'Cash', value: 10 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {COLORS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <KPICard 
                    title="Churn Rate" 
                    value={formatPercent(churnData.churnRate)} 
                    trend="High Risk" 
                    isPositive={false} 
                    icon={AlertCircle}
                    color="red"
                  />
                  <KPICard 
                    title="Active Customers" 
                    value={churnData.activeCustomers.toLocaleString()} 
                    trend="+2.1%" 
                    isPositive={true} 
                    icon={CheckCircle2}
                    color="emerald"
                  />
                  <KPICard 
                    title="Avg Order Value" 
                    value={formatCurrency(kpis.avgOrderValue)} 
                    trend="+5.4%" 
                    isPositive={true} 
                    icon={ShoppingBag}
                    color="blue"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ChartContainer title="Customer Segmentation (RFM Analysis)" subtitle="Recency vs Monetary Value distribution">
                    <ResponsiveContainer width="100%" height={450}>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis type="number" dataKey="revenue" name="Revenue" unit="$" label={{ value: 'Monetary Value', position: 'bottom', offset: 0 }} />
                        <YAxis type="number" dataKey="profit" name="Profit" unit="$" label={{ value: 'Profitability', angle: -90, position: 'left' }} />
                        <ZAxis type="number" range={[100, 1000]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Customers" data={data.slice(0, 200)} fill="#8b5cf6" fillOpacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  <ChartContainer title="High Risk Customers" subtitle="Top 10 customers by churn probability score">
                    <div className="space-y-4">
                      {churnData.highRiskCustomers.map((customer: any) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-slate-900">{customer.id}</p>
                            <p className="text-xs text-slate-500">Last active {customer.recency} days ago</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    customer.score > 85 ? "bg-red-500" : "bg-amber-500"
                                  )}
                                  style={{ width: `${customer.score}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{customer.score.toFixed(0)}%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Churn Probability</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartContainer>
                </div>
              </div>
            )}

            {activeTab === 'forecast' && (
              <div className="space-y-8">
                <ChartContainer title="6-Month Revenue Forecast" subtitle="Projected growth based on historical trends">
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.isForecast) {
                            return <circle cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="none" />;
                          }
                          return <circle cx={cx} cy={cy} r={4} fill="#10b981" stroke="none" />;
                        }}
                        strokeDasharray={(props: any) => props.isForecast ? "5 5" : "0"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1">Forecast Interpretation</h4>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      Based on our linear regression model, we anticipate a steady 4.2% month-over-month growth. 
                      The Q4 seasonality factor is expected to drive a significant spike in revenue, potentially reaching 
                      {formatCurrency(forecastData[forecastData.length - 1].revenue)} by year-end. 
                      Strategic inventory planning for 'Electronics' and 'Fashion' categories is recommended to meet this demand.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <AlertCircle className="text-emerald-600" />
                    Executive Insights
                  </h3>
                  <div className="space-y-4">
                    <InsightItem 
                      title="Revenue Concentration" 
                      content="Top 20% of customers contribute to 49.4% of total revenue. High dependency on premium segments."
                    />
                    <InsightItem 
                      title="Category Performance" 
                      content="Fashion leads in volume, but Electronics drives the highest profit per order ($245 avg)."
                    />
                    <InsightItem 
                      title="Churn Risk" 
                      content="Current churn rate of 73.8% is critical. Most churn occurs after 120 days of inactivity."
                    />
                    <InsightItem 
                      title="Regional Growth" 
                      content="The 'RJ' region is the most profitable, while 'South' shows high revenue but lower margins due to logistics costs."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="text-blue-600" />
                    Strategic Recommendations
                  </h3>
                  <div className="space-y-4">
                    <RecommendationItem 
                      title="Retention Program" 
                      action="Implement a loyalty program targeting 'Star' customers to reduce the 73.8% churn rate."
                    />
                    <RecommendationItem 
                      title="Cost Optimization" 
                      action="Review logistics in the 'South' region to improve the current 38% profit margin."
                    />
                    <RecommendationItem 
                      title="Inventory Strategy" 
                      action="Increase Q4 inventory for Electronics by 30% based on forecasted seasonal demand."
                    />
                    <RecommendationItem 
                      title="Payment Incentives" 
                      action="Offer 2% discount for Bank Transfers to reduce Credit Card processing fees (currently 45% of transactions)."
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function KPICard({ title, value, trend, isPositive, icon: Icon, color }: any) {
  const colorClasses: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}

function ChartContainer({ title, subtitle, children, className }: any) {
  return (
    <div className={cn("bg-white p-6 rounded-2xl border border-slate-200 shadow-sm", className)}>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-slate-500 text-sm">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function InsightItem({ title, content }: any) {
  return (
    <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-slate-600 text-sm leading-relaxed">{content}</p>
    </div>
  );
}

function RecommendationItem({ title, action }: any) {
  return (
    <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
      <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-blue-700 text-sm font-medium bg-blue-50 p-2 rounded-lg mt-2 flex items-center gap-2">
        <ChevronRight size={16} />
        {action}
      </p>
    </div>
  );
}
