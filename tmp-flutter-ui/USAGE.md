# Kahan rakhna hai

```
lib/
  theme/
    dashboard_theme.dart   <- naya file
  screens/
    home_screen.dart       <- purana replace
  widgets/
    app_bottom_nav.dart    <- pehle se maujood
```

Agar package name `finova` nahi hai to dono import lines badal dena:

```dart
import 'package:finova/theme/dashboard_theme.dart';
import 'package:finova/widgets/app_bottom_nav.dart';
```

## Khali dashboard (jaisa screenshot me hai)

```dart
const HomeScreen(
  userName: 'Sajjad Waseem',
  companyName: 'Sajjad Enterprises',
)
```

## Data ke saath

```dart
HomeScreen(
  userName: 'Sajjad Waseem',
  companyName: 'Sajjad Enterprises',
  unreadNotifications: 3,
  data: DashboardData(
    currency: 'Rs',
    cashBalance: 6240000,
    revenue: 8720000,
    expenses: 5310000,
    profit: 3410000,
    revenueGrowth: 8.4,
    receivables: 2480000,
    payables: 1160000,
    todaySales: 385000,
    todayOrders: 12,
    pendingInvoices: 5,
    lowStockCount: 4,
    trend: const [
      TrendPoint(label: 'Mar', revenue: 4.1e6, expenses: 2.8e6, profit: 1.3e6),
      TrendPoint(label: 'Apr', revenue: 5.6e6, expenses: 3.4e6, profit: 2.2e6),
      TrendPoint(label: 'May', revenue: 5.1e6, expenses: 3.9e6, profit: 1.2e6),
      TrendPoint(label: 'Jun', revenue: 7.2e6, expenses: 4.4e6, profit: 2.8e6),
      TrendPoint(label: 'Jul', revenue: 8.7e6, expenses: 5.3e6, profit: 3.4e6),
    ],
    transactions: const [
      TxnItem(
        title: 'Invoice INV-1048 created',
        subtitle: 'Al-Noor Traders • 12 min ago',
        amount: 'Rs 184,500',
        icon: Icons.receipt_long_outlined,
        iconColor: Dash.info,
      ),
      TxnItem(
        title: 'Payment received',
        subtitle: 'Metro Wholesale • 46 min ago',
        amount: 'Rs 92,000',
        icon: Icons.payments_outlined,
        iconColor: Dash.success,
      ),
      TxnItem(
        title: 'Stock adjustment',
        subtitle: 'PVC Resin • 1 hr ago',
        amount: '-120 kg',
        positive: false,
        icon: Icons.inventory_2_outlined,
        iconColor: Dash.warning,
      ),
    ],
    lowStockItems: const [
      LowStockItem(name: 'PVC Resin', stock: '180 kg', minimum: '250 kg'),
      LowStockItem(
        name: 'Poly Bags 12x16',
        stock: '820 pcs',
        minimum: '1,000 pcs',
      ),
    ],
  ),
)
```

## Baaki notes

- `hasData` false hone par "Set up your workspace" card khud dikh jata hai —
  web par bhi yehi logic hai.
- Trend chart `CustomPainter` se bana hai, koi extra package (fl_chart etc.)
  ki zaroorat nahi.
- `Dash` class me saare colors hain — web ke `globals.css` dark theme se
  copy kiye gaye hain, to app aur web bilkul same lagenge.
- Har section ka `onTap` / `onAction` abhi khali hai — wahan
  `Navigator.push(...)` laga dena.
