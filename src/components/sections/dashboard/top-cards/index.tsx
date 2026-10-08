import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import TopCard from './TopCard';
import { api, DashboardStats } from 'services/api';

const TopCards = () => {
  const [stats, setStats] = useState<DashboardStats>({ stockProducts: 0, orders: 0, deliveredOrders: 0, customers: 0, revenue: 0 });

  useEffect(() => {
    api.summary().then((result) => setStats(result.stats)).catch(() => undefined);
  }, []);

  const cardsData = [
    { id: 1, title: 'Stock Products', value: stats.stockProducts.toLocaleString(), rate: 'Live', isUp: true, icon: 'solar:bag-bold' },
    { id: 2, title: 'Orders', value: stats.orders.toLocaleString(), rate: 'Live', isUp: true, icon: 'ph:bag-simple-fill' },
    { id: 3, title: 'Customers', value: stats.customers.toLocaleString(), rate: 'Live', isUp: true, icon: 'carbon:favorite-filled' },
    { id: 4, title: 'Revenue', value: `$${stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, rate: 'Live', isUp: true, icon: 'mingcute:currency-dollar-2-line' },
  ];

  return (
    <Grid container spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}>
      {cardsData.map((item) => <TopCard key={item.id} {...item} />)}
    </Grid>
  );
};

export default TopCards;
