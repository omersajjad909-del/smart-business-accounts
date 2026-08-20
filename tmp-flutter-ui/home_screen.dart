import 'dart:math' as math;

import 'package:finova/theme/dashboard_theme.dart';
import 'package:finova/widgets/app_bottom_nav.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// =============================================================================
/// HOME SCREEN
///
/// Web dashboard (app/dashboard/DashboardContent) ke mobile layout ka Flutter
/// port. Section order web jaisa hi hai:
///
///   1. Header      → greeting + company + notification bell
///   2. Balance     → gradient card + revenue / expenses / profit
///   3. Quick Actions
///   4. Business Overview → trend chart + 2x2 stat tiles
///   5. Receivables / Payables
///   6. AI Insight
///   7. Recent Transactions
///   8. Inventory alerts
///   9. Getting Started (sirf jab data na ho)
/// =============================================================================

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    this.userName = 'Sajjad Waseem',
    this.companyName = 'Sajjad Enterprises',
    this.data = const DashboardData(),
    this.unreadNotifications = 0,
  });

  final String userName;
  final String companyName;
  final DashboardData data;
  final int unreadNotifications;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late DashboardData _data = widget.data;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  Future<void> _refresh() async {
    // TODO: yahan API call lagni hai — /api/dashboard/stats
    await Future<void>.delayed(const Duration(milliseconds: 700));

    if (!mounted) return;

    setState(() => _data = widget.data);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Dashboard updated'),
        duration: Duration(milliseconds: 900),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: Dash.appBg,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: Dash.appBg,
        body: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: Dash.indigo,
            backgroundColor: Dash.panelBg,
            onRefresh: _refresh,
            child: ListView(
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 28),
              children: [
                _Header(
                  greeting: _greeting,
                  userName: widget.userName,
                  companyName: widget.companyName,
                  unread: widget.unreadNotifications,
                  onBellTap: () {},
                  onCompanyTap: () {},
                ),

                const SizedBox(height: 16),

                _BalanceCard(data: _data),

                const SizedBox(height: 20),

                const _SectionHeader(title: 'Quick Actions'),
                const SizedBox(height: 14),
                _QuickActions(onTap: (label) {}),

                const SizedBox(height: 20),

                _SectionHeader(
                  title: 'Business Overview',
                  actionLabel: 'Full Report',
                  onAction: () {},
                ),
                const SizedBox(height: 12),
                _BusinessOverview(data: _data),

                const SizedBox(height: 20),

                _ReceivablesPayables(data: _data),

                const SizedBox(height: 20),

                _AiInsightCard(onViewDetails: () {}),

                const SizedBox(height: 20),

                _SectionHeader(
                  title: 'Recent Transactions',
                  actionLabel: 'View All',
                  onAction: () {},
                ),
                const SizedBox(height: 14),
                _RecentTransactions(items: _data.transactions),

                if (_data.lowStockItems.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Inventory Alerts',
                    actionLabel: 'View All',
                    onAction: () {},
                  ),
                  const SizedBox(height: 14),
                  for (final item in _data.lowStockItems) ...[
                    _InventoryAlert(item: item),
                    const SizedBox(height: 10),
                  ],
                ],

                if (!_data.hasData) ...[
                  const SizedBox(height: 20),
                  _GettingStarted(onTap: (label) {}),
                ],
              ],
            ),
          ),
        ),
        bottomNavigationBar: AppBottomNav(
          currentIndex: 0,
          onChanged: (index) {
            // baad mein navigation
          },
        ),
      ),
    );
  }
}

/// =============================================================================
/// HEADER
/// =============================================================================

class _Header extends StatelessWidget {
  const _Header({
    required this.greeting,
    required this.userName,
    required this.companyName,
    required this.unread,
    required this.onBellTap,
    required this.onCompanyTap,
  });

  final String greeting;
  final String userName;
  final String companyName;
  final int unread;
  final VoidCallback onBellTap;
  final VoidCallback onCompanyTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Company avatar / logo
        Container(
          width: 46,
          height: 46,
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.05),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.10),
            ),
          ),
          child: ClipOval(
            child: Image.asset(
              'assets/brand/finova_logo.png',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  userName.isNotEmpty ? userName[0].toUpperCase() : 'F',
                  style: const TextStyle(
                    color: Dash.indigoSoft,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(width: 11),

        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greeting,
                style: const TextStyle(
                  color: Dash.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$userName 👋',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Dash.textPrimary,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.45,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 6),
              InkWell(
                onTap: onCompanyTap,
                borderRadius: BorderRadius.circular(6),
                child: Row(
                  children: [
                    const Text(
                      'Company: ',
                      style: TextStyle(
                        color: Dash.textMuted,
                        fontSize: 12,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        companyName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Dash.indigoSoft,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 3),
                    const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      size: 15,
                      color: Dash.indigoSoft,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Notification bell
        Stack(
          clipBehavior: Clip.none,
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onBellTap,
                borderRadius: BorderRadius.circular(13),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(13),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.10),
                    ),
                  ),
                  child: const Icon(
                    Icons.notifications_none_rounded,
                    size: 19,
                    color: Dash.textPrimary,
                  ),
                ),
              ),
            ),
            if (unread > 0)
              Positioned(
                top: 7,
                right: 7,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 8),
                  height: 8,
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: Dash.danger,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Dash.panelBg, width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    unread > 9 ? '9+' : '',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 7,
                      fontWeight: FontWeight.w800,
                      height: 1,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// =============================================================================
/// TOTAL BALANCE CARD
/// =============================================================================

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final positive = data.revenueGrowth >= 0;
    final cur = data.currency;

    return Container(
      decoration: BoxDecoration(
        gradient: Dash.balanceGradient,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Dash.indigo.withValues(alpha: 0.35),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            // Decorative circles — web wale jaise
            const Positioned(
              top: -30,
              right: -30,
              child: _Circle(size: 160, opacity: 0.04),
            ),
            const Positioned(
              bottom: -20,
              left: -20,
              child: _Circle(size: 120, opacity: 0.03),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TOTAL BALANCE',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.55),
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1.1,
                              ),
                            ),
                            const SizedBox(height: 6),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                '$cur ${fmtAmount(data.cashBalance)}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -1.5,
                                  height: 1,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(
                                  positive
                                      ? Icons.trending_up_rounded
                                      : Icons.trending_down_rounded,
                                  size: 13,
                                  color: positive
                                      ? Dash.successSoft
                                      : Dash.dangerSoft,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${data.revenueGrowth.abs().toStringAsFixed(1)}%'
                                  ' vs last month',
                                  style: TextStyle(
                                    color: positive
                                        ? Dash.successSoft
                                        : Dash.dangerSoft,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(width: 12),

                      // Card icon chip
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.20),
                          ),
                        ),
                        child: const Icon(
                          Icons.credit_card_rounded,
                          size: 22,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  Container(
                    padding: const EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(
                      border: Border(
                        top: BorderSide(
                          color: Colors.white.withValues(alpha: 0.12),
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _BalanceStat(
                            label: 'REVENUE',
                            value: '$cur ${fmtAmount(data.revenue)}',
                            color: Dash.successSoft,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: _BalanceStat(
                            label: 'EXPENSES',
                            value: '$cur ${fmtAmount(data.expenses)}',
                            color: Dash.dangerSoft,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: _BalanceStat(
                            label: 'PROFIT',
                            value: '$cur ${fmtAmount(data.profit)}',
                            color: data.profit >= 0
                                ? Dash.successSoft
                                : Dash.dangerSoft,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Circle extends StatelessWidget {
  const _Circle({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: opacity),
      ),
    );
  }
}

class _BalanceStat extends StatelessWidget {
  const _BalanceStat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.45),
            fontSize: 9,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.7,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

/// =============================================================================
/// SECTION HEADER
/// =============================================================================

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Dash.textPrimary,
            fontSize: 15,
            fontWeight: FontWeight.w800,
          ),
        ),
        if (actionLabel != null)
          InkWell(
            onTap: onAction,
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: Text(
                actionLabel!,
                style: const TextStyle(
                  color: Dash.indigoSoft,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// =============================================================================
/// QUICK ACTIONS
/// =============================================================================

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.onTap});

  final ValueChanged<String> onTap;

  static const _actions = <_QuickAction>[
    _QuickAction(
      label: '+ Invoice',
      icon: Icons.description_outlined,
      colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
    ),
    _QuickAction(
      label: '+ Sale',
      icon: Icons.shopping_cart_outlined,
      colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
    ),
    _QuickAction(
      label: '+ Expense',
      icon: Icons.credit_card_outlined,
      colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    ),
    _QuickAction(
      label: '+ Product',
      icon: Icons.inventory_2_outlined,
      colors: [Color(0xFF10B981), Color(0xFF059669)],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final action in _actions)
          Expanded(
            child: InkWell(
              onTap: () => onTap(action.label),
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: action.colors,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(
                        action.icon,
                        size: 22,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      action.label,
                      maxLines: 1,
                      style: const TextStyle(
                        color: Dash.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _QuickAction {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.colors,
  });

  final String label;
  final IconData icon;
  final List<Color> colors;
}

/// =============================================================================
/// BUSINESS OVERVIEW — legend + trend chart + 2x2 stat tiles
/// =============================================================================

class _BusinessOverview extends StatelessWidget {
  const _BusinessOverview({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final cur = data.currency;

    return Column(
      children: [
        // ── Chart card ──
        Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
          decoration: BoxDecoration(
            color: Dash.panelBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Dash.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  _LegendDot(label: 'Revenue', color: Dash.indigo),
                  SizedBox(width: 14),
                  _LegendDot(label: 'Expenses', color: Dash.danger),
                  SizedBox(width: 14),
                  _LegendDot(label: 'Profit', color: Dash.success),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 148,
                child: data.trend.length < 2
                    ? const _EmptyChart()
                    : CustomPaint(
                        size: Size.infinite,
                        painter: _TrendChartPainter(points: data.trend),
                      ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 10),

        // ── 2x2 stat tiles ──
        Row(
          children: [
            Expanded(
              child: _StatTile(
                emoji: '🛍️',
                value: '$cur ${fmtAmount(data.todaySales)}',
                label: "TODAY'S SALES",
                color: Dash.success,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _StatTile(
                emoji: '📦',
                value: '${data.todayOrders}',
                label: 'ORDERS TODAY',
                color: Dash.info,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _StatTile(
                emoji: '🧾',
                value: '${data.pendingInvoices}',
                label: 'PENDING INVOICES',
                color: Dash.warning,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _StatTile(
                emoji: '⚠️',
                value: '${data.lowStockCount}',
                label: 'LOW STOCK ITEMS',
                color: Dash.danger,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 3,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            color: Dash.textMuted,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _EmptyChart extends StatelessWidget {
  const _EmptyChart();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('📊', style: TextStyle(fontSize: 28)),
          SizedBox(height: 6),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'No data yet. Start adding sales to see your trend.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Dash.textMuted,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Chhota sa line/area chart — koi extra package nahi chahiye.
class _TrendChartPainter extends CustomPainter {
  _TrendChartPainter({required this.points});

  final List<TrendPoint> points;

  @override
  void paint(Canvas canvas, Size size) {
    double maxValue = 0;
    for (final p in points) {
      maxValue = math.max(
        maxValue,
        math.max(p.revenue, math.max(p.expenses, p.profit)),
      );
    }
    if (maxValue <= 0) maxValue = 1;

    // Horizontal grid lines
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..strokeWidth = 1;

    for (var i = 0; i <= 3; i++) {
      final y = size.height * (i / 3);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    Path buildPath(double Function(TrendPoint) pick) {
      final path = Path();
      for (var i = 0; i < points.length; i++) {
        final x = size.width * (i / (points.length - 1));
        final y = size.height - (pick(points[i]) / maxValue) * size.height * 0.9;
        if (i == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      return path;
    }

    // Revenue ke neeche halka gradient fill
    final revenuePath = buildPath((p) => p.revenue);
    final fillPath = Path.from(revenuePath)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(
      fillPath,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Dash.indigo.withValues(alpha: 0.30),
            Dash.indigo.withValues(alpha: 0.0),
          ],
        ).createShader(Offset.zero & size),
    );

    void stroke(Path path, Color color) {
      canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round,
      );
    }

    stroke(revenuePath, Dash.indigo);
    stroke(buildPath((p) => p.expenses), Dash.danger);
    stroke(buildPath((p) => p.profit), Dash.success);
  }

  @override
  bool shouldRepaint(covariant _TrendChartPainter oldDelegate) =>
      oldDelegate.points != points;
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.emoji,
    required this.value,
    required this.label,
    required this.color,
  });

  final String emoji;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Dash.panelBg,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: Dash.border),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 22, height: 1)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                    height: 1,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Dash.textMuted,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.35,
                    height: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// =============================================================================
/// RECEIVABLES / PAYABLES
/// =============================================================================

class _ReceivablesPayables extends StatelessWidget {
  const _ReceivablesPayables({required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context) {
    final cur = data.currency;

    return Row(
      children: [
        Expanded(
          child: _MoneyCard(
            title: 'Receivables',
            amount: '$cur ${fmtAmount(data.receivables)}',
            subtitle: 'Due from customers',
            icon: Icons.arrow_downward_rounded,
            color: Dash.success,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MoneyCard(
            title: 'Payables',
            amount: '$cur ${fmtAmount(data.payables)}',
            subtitle: 'Due to suppliers',
            icon: Icons.arrow_upward_rounded,
            color: Dash.warning,
          ),
        ),
      ],
    );
  }
}

class _MoneyCard extends StatelessWidget {
  const _MoneyCard({
    required this.title,
    required this.amount,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  final String title;
  final String amount;
  final String subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Dash.panelBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Dash.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              const Spacer(),
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 11,
                color: Colors.white.withValues(alpha: 0.20),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: Dash.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            amount,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Dash.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Dash.textMuted.withValues(alpha: 0.7),
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }
}

/// =============================================================================
/// AI INSIGHT
/// =============================================================================

class _AiInsightCard extends StatelessWidget {
  const _AiInsightCard({required this.onViewDetails});

  final VoidCallback onViewDetails;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Dash.indigo.withValues(alpha: 0.12),
            Dash.violet.withValues(alpha: 0.07),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Dash.indigo.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Dash.indigoDeep, Dash.violet],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Dash.indigo.withValues(alpha: 0.45),
                  blurRadius: 18,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Center(
              child: Text('🧠', style: TextStyle(fontSize: 26)),
            ),
          ),

          const SizedBox(width: 14),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'AI Insight',
                      style: TextStyle(
                        color: Dash.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 7),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Dash.indigo.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Dash.indigo.withValues(alpha: 0.35),
                        ),
                      ),
                      child: const Text(
                        'NEW',
                        style: TextStyle(
                          color: Dash.indigoSoft,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Track business performance with AI-powered insights and '
                  'smart alerts.',
                  style: TextStyle(
                    color: Dash.textMuted,
                    fontSize: 11.5,
                    height: 1.65,
                  ),
                ),
                const SizedBox(height: 10),
                InkWell(
                  onTap: onViewDetails,
                  borderRadius: BorderRadius.circular(9),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Dash.indigo.withValues(alpha: 0.20),
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(
                        color: Dash.indigo.withValues(alpha: 0.30),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'View Details',
                          style: TextStyle(
                            color: Dash.violetSoft,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SizedBox(width: 5),
                        Icon(
                          Icons.arrow_forward_rounded,
                          size: 12,
                          color: Dash.violetSoft,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// =============================================================================
/// RECENT TRANSACTIONS
/// =============================================================================

class _RecentTransactions extends StatelessWidget {
  const _RecentTransactions({required this.items});

  final List<TxnItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Container(
        height: 140,
        decoration: BoxDecoration(
          color: Dash.panelBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Dash.border),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('🧾', style: TextStyle(fontSize: 28)),
              SizedBox(height: 8),
              Text(
                'No recent activity',
                style: TextStyle(
                  color: Dash.textMuted,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Dash.panelBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Dash.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            _TxnRow(item: items[i], isLast: i == items.length - 1),
        ],
      ),
    );
  }
}

class _TxnRow extends StatelessWidget {
  const _TxnRow({required this.item, required this.isLast});

  final TxnItem item;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(bottom: BorderSide(color: Dash.border)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: item.iconColor.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, size: 17, color: item.iconColor),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Dash.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  item.subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Dash.textMuted,
                    fontSize: 9.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            item.amount,
            style: TextStyle(
              color: item.positive ? Dash.successSoft : Dash.dangerSoft,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

/// =============================================================================
/// INVENTORY ALERT
/// =============================================================================

class _InventoryAlert extends StatelessWidget {
  const _InventoryAlert({required this.item});

  final LowStockItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Dash.panelBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Dash.border),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Dash.warning.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.inventory_2_outlined,
              size: 18,
              color: Dash.warning,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Dash.textPrimary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Minimum: ${item.minimum}',
                  style: const TextStyle(
                    color: Dash.textMuted,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                item.stock,
                style: const TextStyle(
                  color: Dash.warning,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Low stock',
                style: TextStyle(
                  color: Dash.warning.withValues(alpha: 0.55),
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// =============================================================================
/// GETTING STARTED
/// =============================================================================

class _GettingStarted extends StatelessWidget {
  const _GettingStarted({required this.onTap});

  final ValueChanged<String> onTap;

  static const _links = [
    'Chart of Accounts',
    'Opening Balances',
    'Setup Checklist',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        color: Dash.indigo.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Dash.indigo.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'GETTING STARTED',
            style: TextStyle(
              color: Dash.indigo.withValues(alpha: 0.7),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Set up your workspace',
            style: TextStyle(
              color: Dash.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            'Import opening balances to begin tracking your finances '
            'professionally.',
            style: TextStyle(
              color: Dash.textMuted,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final label in _links)
                InkWell(
                  onTap: () => onTap(label),
                  borderRadius: BorderRadius.circular(9),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: Dash.indigo.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(
                        color: Dash.indigo.withValues(alpha: 0.28),
                      ),
                    ),
                    child: Text(
                      label,
                      style: const TextStyle(
                        color: Dash.indigoSoft,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
