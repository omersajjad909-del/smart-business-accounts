import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.companyName,
    required this.branchName,
  });

  final String companyName;
  final String branchName;

  static const Color background = Color(0xFF04061A);
  static const Color backgroundAlt = Color(0xFF0A0620);
  static const Color surface = Color(0xFF0C1228);
  static const Color surfaceSoft = Color(0xFF111936);
  static const Color border = Color(0x1FFFFFFF);
  static const Color indigo = Color(0xFF818CF8);
  static const Color violet = Color(0xFFA78BFA);
  static const Color cyan = Color(0xFF60A5FA);
  static const Color green = Color(0xFF34D399);
  static const Color amber = Color(0xFFFBBF24);
  static const Color text = Color(0xFFF8FAFC);
  static const Color muted = Color(0xFF94A3B8);

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: background,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: background,
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [background, backgroundAlt],
            ),
          ),
          child: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final horizontalPadding = width < 640 ? 16.0 : width < 1024 ? 24.0 : 32.0;
                final contentWidth = width > 1320 ? 1320.0 : width;
                final isDesktop = width >= 1100;
                final isTablet = width >= 700;

                return Stack(
                  children: [
                    const _HeroBackground(),
                    Align(
                      alignment: Alignment.topCenter,
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: EdgeInsets.fromLTRB(horizontalPadding, 12, horizontalPadding, 40),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(maxWidth: contentWidth),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _header(isDesktop: isDesktop),
                              const SizedBox(height: 20),
                              if (isDesktop)
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      flex: 6,
                                      child: _heroSummary(),
                                    ),
                                    const SizedBox(width: 20),
                                    Expanded(
                                      flex: 5,
                                      child: _balanceCard(compact: false),
                                    ),
                                  ],
                                )
                              else ...[
                                _heroSummary(),
                                const SizedBox(height: 18),
                                _balanceCard(compact: true),
                              ],
                              const SizedBox(height: 24),
                              _sectionTitle('Quick Actions', action: 'Smart shortcuts'),
                              const SizedBox(height: 14),
                              _quickActions(width),
                              const SizedBox(height: 24),
                              if (isTablet)
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(flex: 7, child: _businessOverview(height: 320)),
                                    const SizedBox(width: 18),
                                    Expanded(flex: 5, child: _aiInsight()),
                                  ],
                                )
                              else ...[
                                _businessOverview(height: 280),
                                const SizedBox(height: 18),
                                _aiInsight(),
                              ],
                              const SizedBox(height: 20),
                              _statsGrid(width),
                              const SizedBox(height: 24),
                              if (isDesktop)
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: _recentTransactions()),
                                    const SizedBox(width: 18),
                                    Expanded(child: _gettingStarted()),
                                  ],
                                )
                              else ...[
                                _recentTransactions(),
                                const SizedBox(height: 18),
                                _gettingStarted(),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _header({required bool isDesktop}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [indigo, violet],
              ),
              boxShadow: [
                BoxShadow(
                  color: indigo.withValues(alpha: 0.35),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            alignment: Alignment.center,
            child: const Text(
              'F',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _greeting(),
                  style: const TextStyle(
                    color: muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Umer Sajjad',
                  style: TextStyle(
                    color: text,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Company: $companyName  |  Branch: $branchName',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFCBD5E1),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (isDesktop)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: green.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: green.withValues(alpha: 0.28)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle, color: green, size: 8),
                  SizedBox(width: 8),
                  Text(
                    'Live Dashboard',
                    style: TextStyle(
                      color: green,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 10),
          _headerIcon(Icons.notifications_none_rounded),
        ],
      ),
    );
  }

  Widget _heroSummary() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: indigo.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: indigo.withValues(alpha: 0.25)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.bolt_rounded, color: green, size: 14),
                SizedBox(width: 8),
                Text(
                  'FINOVAOS AI BUSINESS DASHBOARD',
                  style: TextStyle(
                    color: Color(0xFFC7D2FE),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Run your business with clarity.\nLet AI handle the numbers.',
            style: TextStyle(
              color: text,
              fontSize: 34,
              height: 1.08,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Same FinovaOS website feel, but now inside your Flutter app: premium dark gradients, glass cards, strong metrics and responsive content blocks.',
            style: TextStyle(
              color: Color(0xFFAAB6CF),
              fontSize: 14,
              height: 1.7,
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: const [
              _FeatureChip(icon: Icons.schedule_rounded, label: 'Save hours every week'),
              _FeatureChip(icon: Icons.payments_outlined, label: 'Collect payments faster'),
              _FeatureChip(icon: Icons.analytics_outlined, label: 'Live business insights'),
              _FeatureChip(icon: Icons.inventory_2_outlined, label: 'Inventory visibility'),
            ],
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: const [
              _HeroButton(label: 'Get Started', isPrimary: true),
              _HeroButton(label: 'Watch Demo'),
            ],
          ),
          const SizedBox(height: 22),
          Wrap(
            spacing: 18,
            runSpacing: 10,
            children: const [
              _ProofItem('14-day money-back'),
              _ProofItem('Cancel anytime'),
              _ProofItem('No setup fee'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _balanceCard({required bool compact}) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0B1124),
            Color(0xFF111B39),
            Color(0xFF0F1732),
          ],
        ),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 40,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'BUSINESS DASHBOARD',
                      style: TextStyle(
                        color: Color(0xFF9FB0D9),
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.1,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'March 2026  |  All warehouses',
                      style: TextStyle(
                        color: muted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: green.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: green.withValues(alpha: 0.22)),
                ),
                child: const Text(
                  'Live',
                  style: TextStyle(
                    color: green,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          compact
              ? Column(
                  children: const [
                    _MetricCard(
                      label: 'REVENUE',
                      value: 'Rs 284k',
                      accent: green,
                      foot: '22% vs last month',
                    ),
                    SizedBox(height: 12),
                    _MetricCard(
                      label: 'NET PROFIT',
                      value: 'Rs 112k',
                      accent: indigo,
                      foot: '63% profit margin',
                    ),
                  ],
                )
              : const Row(
                  children: [
                    Expanded(
                      child: _MetricCard(
                        label: 'REVENUE',
                        value: 'Rs 284k',
                        accent: green,
                        foot: '22% vs last month',
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: _MetricCard(
                        label: 'NET PROFIT',
                        value: 'Rs 112k',
                        accent: indigo,
                        foot: '63% profit margin',
                      ),
                    ),
                  ],
                ),
          const SizedBox(height: 16),
          _miniInvoiceCard(),
          const SizedBox(height: 16),
          Row(
            children: const [
              Expanded(
                child: _TinyStat(
                  icon: Icons.warehouse_outlined,
                  label: 'Warehouses',
                  value: '3 active',
                  accent: amber,
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _TinyStat(
                  icon: Icons.shopping_bag_outlined,
                  label: 'Open Orders',
                  value: '28',
                  accent: green,
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _TinyStat(
                  icon: Icons.auto_awesome_outlined,
                  label: 'AI Score',
                  value: '91/100',
                  accent: violet,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniInvoiceCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Column(
        children: const [
          _InvoiceRow(
            title: 'Customer A - Trading',
            amount: 'Rs 12,400',
            status: 'Paid',
            accent: green,
            isHeader: true,
          ),
          _InvoiceRow(
            title: 'Customer B - Retail',
            amount: 'Rs 8,750',
            status: 'Pending',
            accent: amber,
          ),
          _InvoiceRow(
            title: 'Customer C - Wholesale',
            amount: 'Rs 21,100',
            status: 'Paid',
            accent: green,
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, {String? action}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              color: text,
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        if (action != null)
          Text(
            action,
            style: const TextStyle(
              color: Color(0xFFC7D2FE),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
      ],
    );
  }

  Widget _quickActions(double width) {
    final columns = width >= 1100 ? 4 : width >= 700 ? 2 : 1;
    const actions = [
      _ActionData(Icons.description_outlined, '+ Invoice', indigo),
      _ActionData(Icons.point_of_sale_outlined, '+ Sale', cyan),
      _ActionData(Icons.receipt_long_outlined, '+ Expense', amber),
      _ActionData(Icons.inventory_2_outlined, '+ Product', green),
    ];

    return _ResponsiveGrid(
      columns: columns,
      spacing: 14,
      children: actions
          .map(
            (action) => _ActionCard(
              icon: action.icon,
              label: action.label,
              accent: action.color,
            ),
          )
          .toList(),
    );
  }

  Widget _businessOverview({required double height}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle('Business Overview', action: 'Full report'),
          const SizedBox(height: 14),
          const Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              _LegendDot(color: indigo, label: 'Revenue'),
              _LegendDot(color: amber, label: 'Expenses'),
              _LegendDot(color: green, label: 'Profit'),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: height,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withValues(alpha: 0.03),
                    Colors.white.withValues(alpha: 0.01),
                  ],
                ),
              ),
              child: CustomPaint(
                painter: _OverviewChartPainter(),
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_graph_rounded, color: Color(0xFF7C8AB0), size: 38),
                      SizedBox(height: 10),
                      Text(
                        'Your performance graph will appear here.\nStart adding sales, purchases and expenses.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFF91A1C7),
                          fontSize: 12,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _aiInsight() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF111646),
            violet.withValues(alpha: 0.10),
            surface,
          ],
        ),
        border: Border.all(color: violet.withValues(alpha: 0.20)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _SquareIcon(icon: Icons.auto_awesome_rounded, accent: violet),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Insight',
                      style: TextStyle(
                        color: text,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Revenue is up 22% this month. Stock risk detected in 4 items and two invoices may get delayed.',
                      style: TextStyle(
                        color: Color(0xFFB8C2DA),
                        fontSize: 13,
                        height: 1.6,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 18),
          _InsightLine(
            title: 'Smart alert',
            body: 'Follow up Customer B within 24 hours to improve collection cycle.',
          ),
          SizedBox(height: 12),
          _InsightLine(
            title: 'Opportunity',
            body: 'Fast-moving products are outperforming last month by 18%.',
          ),
          SizedBox(height: 18),
          _HeroButton(label: 'View Details', isPrimary: true, compact: true),
        ],
      ),
    );
  }

  Widget _statsGrid(double width) {
    final columns = width >= 1100 ? 4 : width >= 700 ? 2 : 1;
    return _ResponsiveGrid(
      columns: columns,
      spacing: 14,
      children: const [
        _StatCard(
          icon: Icons.point_of_sale_rounded,
          title: 'TODAY\'S SALES',
          value: 'Rs 0',
          accent: green,
        ),
        _StatCard(
          icon: Icons.inventory_rounded,
          title: 'ORDERS TODAY',
          value: '0',
          accent: indigo,
        ),
        _StatCard(
          icon: Icons.receipt_long_rounded,
          title: 'PENDING INVOICES',
          value: '0',
          accent: amber,
        ),
        _StatCard(
          icon: Icons.warning_amber_rounded,
          title: 'LOW STOCK ITEMS',
          value: '0',
          accent: violet,
        ),
      ],
    );
  }

  Widget _recentTransactions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text(
            'Recent Transactions',
            style: TextStyle(
              color: text,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          SizedBox(height: 14),
          _TransactionTile(
            title: 'Invoice #1001',
            subtitle: 'Customer A paid via bank transfer',
            amount: '+ Rs 12,400',
            accent: green,
          ),
          SizedBox(height: 10),
          _TransactionTile(
            title: 'Expense Voucher #14',
            subtitle: 'Office supplies and packaging',
            amount: '- Rs 2,100',
            accent: amber,
          ),
          SizedBox(height: 10),
          _TransactionTile(
            title: 'Sales Order #305',
            subtitle: 'New retail order created',
            amount: 'Pending',
            accent: indigo,
          ),
        ],
      ),
    );
  }

  Widget _gettingStarted() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'GETTING STARTED',
            style: TextStyle(
              color: violet.withValues(alpha: 0.95),
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Set up your workspace',
            style: TextStyle(
              color: text,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Import opening balances, configure accounts and complete your setup checklist to match the polished website experience.',
            style: TextStyle(
              color: Color(0xFFAAB6CF),
              fontSize: 13,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _setupButton('Chart of Accounts'),
              _setupButton('Opening Balances'),
              _setupButton('Setup Checklist'),
              _setupButton('Invite Team'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _setupButton(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: indigo.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: indigo.withValues(alpha: 0.20)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFFC7D2FE),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _headerIcon(IconData icon) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

class _HeroBackground extends StatelessWidget {
  const _HeroBackground();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(painter: _GridBackgroundPainter()),
          ),
          Positioned(
            left: -120,
            top: -80,
            child: _blurOrb(color: HomeScreen.indigo.withValues(alpha: 0.18), size: 280),
          ),
          Positioned(
            right: -80,
            top: 140,
            child: _blurOrb(color: HomeScreen.violet.withValues(alpha: 0.16), size: 260),
          ),
          Positioned(
            left: 90,
            bottom: 40,
            child: _blurOrb(color: HomeScreen.cyan.withValues(alpha: 0.10), size: 220),
          ),
        ],
      ),
    );
  }

  Widget _blurOrb({required Color color, required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, Colors.transparent],
        ),
      ),
    );
  }
}

class _ResponsiveGrid extends StatelessWidget {
  const _ResponsiveGrid({
    required this.columns,
    required this.spacing,
    required this.children,
  });

  final int columns;
  final double spacing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final totalSpacing = spacing * (columns - 1);
        final itemWidth = (constraints.maxWidth - totalSpacing) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: children
              .map(
                (child) => SizedBox(
                  width: itemWidth,
                  child: child,
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _ActionData {
  const _ActionData(this.icon, this.label, this.color);

  final IconData icon;
  final String label;
  final Color color;
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.label,
    required this.accent,
  });

  final IconData icon;
  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accent.withValues(alpha: 0.22),
            accent.withValues(alpha: 0.10),
          ],
        ),
        border: Border.all(color: accent.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: text,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 20),
        ],
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  const _FeatureChip({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HomeScreen.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: HomeScreen.cyan, size: 16),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFD6DEF3),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroButton extends StatelessWidget {
  const _HeroButton({
    required this.label,
    this.isPrimary = false,
    this.compact = false,
  });

  final String label;
  final bool isPrimary;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final padding = compact
        ? const EdgeInsets.symmetric(horizontal: 14, vertical: 10)
        : const EdgeInsets.symmetric(horizontal: 18, vertical: 14);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: isPrimary
            ? const LinearGradient(colors: [HomeScreen.indigo, HomeScreen.violet])
            : null,
        color: isPrimary ? null : Colors.white.withValues(alpha: 0.05),
        border: Border.all(
          color: isPrimary ? Colors.transparent : HomeScreen.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: compact ? 12 : 14,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
        ],
      ),
    );
  }
}

class _ProofItem extends StatelessWidget {
  const _ProofItem(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: Color(0xFF8FA1C7),
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.accent,
    required this.foot,
  });

  final String label;
  final String value;
  final Color accent;
  final String foot;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accent.withValues(alpha: 0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: accent.withValues(alpha: 0.88),
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: accent == HomeScreen.green ? Colors.white : HomeScreen.indigo,
              fontSize: 26,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            height: 36,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  accent.withValues(alpha: 0.35),
                  accent.withValues(alpha: 0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            foot,
            style: TextStyle(
              color: accent,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _TinyStat extends StatelessWidget {
  const _TinyStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HomeScreen.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: accent, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: HomeScreen.text,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: HomeScreen.muted,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow({
    required this.title,
    required this.amount,
    required this.status,
    required this.accent,
    this.isHeader = false,
  });

  final String title;
  final String amount;
  final String status;
  final Color accent;
  final bool isHeader;

  @override
  Widget build(BuildContext context) {
    if (isHeader) {
      return Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
          ),
        ),
        child: Row(
          children: [
            const Expanded(
              child: Text(
                'Recent Invoices',
                style: TextStyle(
                  color: Color(0xFFBAC8E6),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Text(
              'View all',
              style: TextStyle(
                color: accent,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.04)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: HomeScreen.indigo.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              title.isNotEmpty ? title[0] : '?',
              style: const TextStyle(
                color: Color(0xFFC7D2FE),
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: HomeScreen.text,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: const TextStyle(
                  color: HomeScreen.text,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    color: accent,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
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

class _LegendDot extends StatelessWidget {
  const _LegendDot({
    required this.color,
    required this.label,
  });

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 4,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: HomeScreen.muted,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _SquareIcon extends StatelessWidget {
  const _SquareIcon({
    required this.icon,
    required this.accent,
  });

  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(icon, color: Colors.white, size: 26),
    );
  }
}

class _InsightLine extends StatelessWidget {
  const _InsightLine({
    required this.title,
    required this.body,
  });

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: HomeScreen.border),
      ),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(
            color: Color(0xFFB8C2DA),
            fontSize: 12,
            height: 1.6,
          ),
          children: [
            TextSpan(
              text: '$title: ',
              style: const TextStyle(
                color: HomeScreen.text,
                fontWeight: FontWeight.w800,
              ),
            ),
            TextSpan(text: body),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.accent,
  });

  final IconData icon;
  final String title;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: HomeScreen.surfaceSoft,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: HomeScreen.border),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: accent, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: accent,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: HomeScreen.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
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

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.accent,
  });

  final String title;
  final String subtitle;
  final String amount;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: HomeScreen.border),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Icons.receipt_rounded, color: accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: HomeScreen.text,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: HomeScreen.muted,
                    fontSize: 11,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            amount,
            style: TextStyle(
              color: accent,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _GridBackgroundPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.04)
      ..strokeWidth = 1;

    const gap = 56.0;
    for (double x = 0; x <= size.width; x += gap) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += gap) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _OverviewChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 1;

    for (int i = 1; i < 5; i++) {
      final y = size.height * i / 5;
      canvas.drawLine(Offset(16, y), Offset(size.width - 16, y), grid);
    }

    final revenue = Paint()
      ..color = HomeScreen.indigo
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final profit = Paint()
      ..color = HomeScreen.green
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final expense = Paint()
      ..color = HomeScreen.amber
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final revenuePath = Path()
      ..moveTo(24, size.height * 0.70)
      ..quadraticBezierTo(size.width * 0.22, size.height * 0.58, size.width * 0.34, size.height * 0.50)
      ..quadraticBezierTo(size.width * 0.49, size.height * 0.42, size.width * 0.64, size.height * 0.38)
      ..quadraticBezierTo(size.width * 0.80, size.height * 0.30, size.width - 24, size.height * 0.22);

    final profitPath = Path()
      ..moveTo(24, size.height * 0.82)
      ..quadraticBezierTo(size.width * 0.24, size.height * 0.72, size.width * 0.36, size.height * 0.66)
      ..quadraticBezierTo(size.width * 0.52, size.height * 0.60, size.width * 0.68, size.height * 0.54)
      ..quadraticBezierTo(size.width * 0.82, size.height * 0.48, size.width - 24, size.height * 0.44);

    final expensePath = Path()
      ..moveTo(24, size.height * 0.74)
      ..quadraticBezierTo(size.width * 0.23, size.height * 0.68, size.width * 0.36, size.height * 0.62)
      ..quadraticBezierTo(size.width * 0.50, size.height * 0.58, size.width * 0.66, size.height * 0.56)
      ..quadraticBezierTo(size.width * 0.82, size.height * 0.50, size.width - 24, size.height * 0.48);

    canvas.drawPath(revenuePath, revenue);
    canvas.drawPath(profitPath, profit);
    canvas.drawPath(expensePath, expense);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
