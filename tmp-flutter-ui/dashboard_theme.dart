import 'package:flutter/material.dart';

/// =============================================================================
/// FinovaOS — Dashboard design tokens
///
/// Ye values web app ke dark theme se li gayi hain (app/globals.css ke
/// `html.dark .dashboard-root` block se), taake mobile app aur web dashboard
/// bilkul same lagen.
/// =============================================================================

class Dash {
  Dash._();

  // Surfaces
  static const appBg = Color(0xFF080C1E); // --app-bg
  static const surface = Color(0xFF0B1124); // --surface
  static const panelBg = Color(0xFF0D1430); // --panel-bg
  static const panelBg2 = Color(0xFF0F1835); // --panel-bg-2
  static const cardBg = Color(0xFF101828); // --card-bg

  // Border = rgba(255,255,255,0.07)
  static const border = Color(0x12FFFFFF);

  // Text
  static const textPrimary = Color(0xFFE8ECF5);
  static const textMuted = Color(0xFF8899BB);

  // Brand / accents
  static const indigo = Color(0xFF6366F1);
  static const indigoDeep = Color(0xFF4F46E5);
  static const indigoSoft = Color(0xFFA5B4FC);
  static const violet = Color(0xFF7C3AED);
  static const violetSoft = Color(0xFFC4B5FD);

  // Status
  static const success = Color(0xFF10B981);
  static const successSoft = Color(0xFF86EFAC);
  static const danger = Color(0xFFF87171);
  static const dangerSoft = Color(0xFFFCA5A5);
  static const warning = Color(0xFFF59E0B);
  static const sky = Color(0xFF0EA5E9);
  static const info = Color(0xFF818CF8);

  // Balance card gradient — linear-gradient(135deg,#1e1b4b,#312e81,#4338ca,#6366f1)
  static const balanceGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF1E1B4B),
      Color(0xFF312E81),
      Color(0xFF4338CA),
      Color(0xFF6366F1),
    ],
    stops: [0.0, 0.35, 0.70, 1.0],
  );
}

/// =============================================================================
/// Currency / number formatting — web ke `fmt()` jaisa
/// =============================================================================

String fmtAmount(num value) {
  final abs = value.abs();
  String out;

  if (abs >= 10000000) {
    out = '${(abs / 10000000).toStringAsFixed(2)}Cr';
  } else if (abs >= 100000) {
    out = '${(abs / 100000).toStringAsFixed(2)}L';
  } else if (abs >= 1000) {
    out = '${(abs / 1000).toStringAsFixed(1)}K';
  } else {
    out = abs.toStringAsFixed(0);
  }

  // Trailing ".00" / ".0" saaf kar do — "1.00M" ki jagah "1M"
  out = out.replaceAll(RegExp(r'\.0+(?=[A-Za-z]|$)'), '');

  return value < 0 ? '-$out' : out;
}

/// =============================================================================
/// Models — API se wire karne ke liye ready
/// =============================================================================

class TrendPoint {
  const TrendPoint({
    required this.label,
    required this.revenue,
    required this.expenses,
    required this.profit,
  });

  final String label;
  final double revenue;
  final double expenses;
  final double profit;
}

class TxnItem {
  const TxnItem({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.icon,
    required this.iconColor,
    this.positive = true,
  });

  final String title;
  final String subtitle;
  final String amount;
  final IconData icon;
  final Color iconColor;
  final bool positive;
}

class LowStockItem {
  const LowStockItem({
    required this.name,
    required this.stock,
    required this.minimum,
  });

  final String name;
  final String stock;
  final String minimum;
}

class DashboardData {
  const DashboardData({
    this.currency = 'Rs',
    this.cashBalance = 0,
    this.revenue = 0,
    this.expenses = 0,
    this.profit = 0,
    this.revenueGrowth = 0,
    this.receivables = 0,
    this.payables = 0,
    this.todaySales = 0,
    this.todayOrders = 0,
    this.pendingInvoices = 0,
    this.lowStockCount = 0,
    this.trend = const [],
    this.transactions = const [],
    this.lowStockItems = const [],
  });

  final String currency;
  final double cashBalance;
  final double revenue;
  final double expenses;
  final double profit;
  final double revenueGrowth;
  final double receivables;
  final double payables;
  final double todaySales;
  final int todayOrders;
  final int pendingInvoices;
  final int lowStockCount;
  final List<TrendPoint> trend;
  final List<TxnItem> transactions;
  final List<LowStockItem> lowStockItems;

  /// Web ka `hasData` — sab kuch khali ho to "Getting Started" card dikhta hai.
  bool get hasData =>
      cashBalance != 0 ||
      revenue != 0 ||
      expenses != 0 ||
      trend.isNotEmpty ||
      transactions.isNotEmpty;
}
