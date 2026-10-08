import { useEffect, useState } from 'react';
import { fontFamily } from 'theme/typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Product from './Product';
import { api, Product as ProductModel } from 'services/api';

const Products = () => {
  const [products, setProducts] = useState<ProductModel[]>([]);
  useEffect(() => { api.products().then((result) => setProducts(result.products.slice(0, 4))).catch(() => undefined); }, []);
  return (
    <Stack direction="column" gap={3.75} component={Paper} height={300}>
      <Typography variant="h6" fontWeight={400} fontFamily={fontFamily.workSans}>Products</Typography>
      <Stack justifyContent="space-between"><Typography variant="caption">Products</Typography><Typography variant="caption">Price</Typography></Stack>
      {products.map((item) => <Product key={item.id} data={{ name: item.name, imageUrl: item.imageUrl ?? '', inStock: item.inStock, price: item.price.toFixed(2) }} />)}
    </Stack>
  );
};
export default Products;
