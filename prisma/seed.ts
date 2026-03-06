import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  // 1. Admin user
  const passwordHash = await bcrypt.hash('changeme123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@koravo.local' },
    update: {},
    create: {
      name: 'Koravo Admin',
      email: 'admin@koravo.local',
      passwordHash,
      role: 'ADMIN',
      avatarInitials: 'KA',
      explainDepth: 'HEADLINE_ACTION',
      isOnboarded: false,
    },
  });

  // 2. Locations
  const [locMum] = await Promise.all([
    prisma.location.upsert({
      where: { code: 'LOC_MUM_01' },
      update: {},
      create: {
        code: 'LOC_MUM_01',
        name: 'Mumbai Flagship',
        type: 'OUTLET',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'IN',
        priorityTier: 'CRITICAL',
        outletFormat: 'FLAGSHIP',
        isRampUp: false,
      },
    }),
  ]);

  // 3. Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'SOUR-001' },
      update: {},
      create: {
        sku: 'SOUR-001',
        name: 'Sourdough Bread',
        category: 'BAKERY',
        baseCostPaise: 12000,
        sellingPricePaise: 24000,
        uom: 'piece',
        shelfLifeDays: 2,
        isHeroSku: true,
        ingredientTier: 'TIER_A',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WW-001' },
      update: {},
      create: {
        sku: 'WW-001',
        name: 'Whole Wheat Loaf',
        category: 'BAKERY',
        baseCostPaise: 9000,
        sellingPricePaise: 20000,
        uom: 'piece',
        shelfLifeDays: 3,
        isHeroSku: true,
        ingredientTier: 'TIER_A',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'ARAB-001' },
      update: {},
      create: {
        sku: 'ARAB-001',
        name: 'Arabica Coffee',
        category: 'BEVERAGES',
        baseCostPaise: 30000,
        sellingPricePaise: 60000,
        uom: 'bag',
        shelfLifeDays: 90,
        isHeroSku: true,
        ingredientTier: 'TIER_A',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'WB-001' },
      update: {},
      create: {
        sku: 'WB-001',
        name: 'White Bread',
        category: 'BAKERY',
        baseCostPaise: 14000,
        sellingPricePaise: 15000,
        uom: 'piece',
        shelfLifeDays: 2,
        isLossLeader: true,
        ingredientTier: 'TIER_B',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'EGG-001' },
      update: {},
      create: {
        sku: 'EGG-001',
        name: 'Eggs (12pk)',
        category: 'DAIRY',
        baseCostPaise: 6000,
        sellingPricePaise: 8000,
        uom: 'pack',
        shelfLifeDays: 14,
        isLossLeader: true,
        ingredientTier: 'TIER_B',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'HERB-001' },
      update: {},
      create: {
        sku: 'HERB-001',
        name: 'Herbal Tea',
        category: 'BEVERAGES',
        baseCostPaise: 10000,
        sellingPricePaise: 22000,
        uom: 'box',
        shelfLifeDays: 365,
        ingredientTier: 'TIER_A',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'SUSHI-001' },
      update: {},
      create: {
        sku: 'SUSHI-001',
        name: 'Sushi Rice',
        category: 'GRAINS',
        baseCostPaise: 15000,
        sellingPricePaise: 26000,
        uom: 'kg',
        shelfLifeDays: 365,
        ingredientTier: 'TIER_B',
      },
    }),
    prisma.product.upsert({
      where: { sku: 'CHSE-001' },
      update: {},
      create: {
        sku: 'CHSE-001',
        name: 'Specialty Cheese',
        category: 'DAIRY',
        baseCostPaise: 40000,
        sellingPricePaise: 70000,
        uom: 'kg',
        shelfLifeDays: 30,
        ingredientTier: 'TIER_A',
      },
    }),
  ]);

  const productBySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  // 4. Suppliers
  await Promise.all([
    prisma.supplier.upsert({
      where: { name: 'Mynte' },
      update: {},
      create: {
        name: 'Mynte',
        classification: 'APPROVED',
        geographyTag: 'Mumbai',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Feedspan' },
      update: {},
      create: {
        name: 'Feedspan',
        classification: 'APPROVED',
        geographyTag: 'Delhi',
      },
    }),
    prisma.supplier.upsert({
      where: { name: 'Pixonyx' },
      update: {},
      create: {
        name: 'Pixonyx',
        classification: 'APPROVED',
        geographyTag: 'Pan-India',
      },
    }),
  ]);

  // 5. TIG Constraints
  const constraints = await prisma.$transaction([
    // DiscountCap: Bakery 10%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Bakery discount cap 10%',
        scope: 'CATEGORY',
        category: 'BAKERY',
        thresholdPct: '0.1000',
        comparisonOp: 'lte',
      },
    }),
    // DiscountCap: Beverages 8%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Beverages discount cap 8%',
        scope: 'CATEGORY',
        category: 'BEVERAGES',
        thresholdPct: '0.0800',
        comparisonOp: 'lte',
      },
    }),
    // DiscountCap: Grains 20%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Grains discount cap 20%',
        scope: 'CATEGORY',
        category: 'GRAINS',
        thresholdPct: '0.2000',
        comparisonOp: 'lte',
      },
    }),
    // DiscountCap: Sourdough zero-discount (hard)
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Sourdough zero-discount',
        description: 'No discount allowed on hero SKU Sourdough',
        scope: 'SKU',
        productId: productBySku['SOUR-001'].id,
        thresholdPct: '0.0000',
        comparisonOp: 'eq',
        isHardConstraint: true,
      },
    }),
    // DiscountCap: Arabica Coffee zero-discount (hard)
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Arabica Coffee zero-discount',
        description: 'No discount allowed on hero SKU Arabica Coffee',
        scope: 'SKU',
        productId: productBySku['ARAB-001'].id,
        thresholdPct: '0.0000',
        comparisonOp: 'eq',
        isHardConstraint: true,
      },
    }),
    // MarginDefinition: Bakery floor 28%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'MARGIN_DEFINITION',
        label: 'Bakery margin floor 28%',
        scope: 'CATEGORY',
        category: 'BAKERY',
        thresholdPct: '0.2800',
        comparisonOp: 'gte',
      },
    }),
    // MarginDefinition: Beverages floor 35%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'MARGIN_DEFINITION',
        label: 'Beverages margin floor 35%',
        scope: 'CATEGORY',
        category: 'BEVERAGES',
        thresholdPct: '0.3500',
        comparisonOp: 'gte',
      },
    }),
    // MarginDefinition: Flagship outlet floor 32%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'MARGIN_DEFINITION',
        label: 'Flagship outlet margin floor 32%',
        scope: 'OUTLET',
        locationId: locMum.id,
        thresholdPct: '0.3200',
        comparisonOp: 'gte',
      },
    }),
    // WasteTolerance: Bakery 1.5% per batch
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'WASTE_TOLERANCE',
        label: 'Bakery waste tolerance 1.5%',
        scope: 'CATEGORY',
        category: 'BAKERY',
        thresholdPct: '0.0150',
        comparisonOp: 'lte',
      },
    }),
    // WasteTolerance: Beverages 0.5%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'WASTE_TOLERANCE',
        label: 'Beverages waste tolerance 0.5%',
        scope: 'CATEGORY',
        category: 'BEVERAGES',
        thresholdPct: '0.0050',
        comparisonOp: 'lte',
      },
    }),
    // WasteTolerance: Dairy 2%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'WASTE_TOLERANCE',
        label: 'Dairy waste tolerance 2%',
        scope: 'CATEGORY',
        category: 'DAIRY',
        thresholdPct: '0.0200',
        comparisonOp: 'lte',
      },
    }),
    // IngredientGrade: Hero SKUs minimum TIER_A (hard, regime-immune)
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'INGREDIENT_GRADE',
        label: 'Hero SKUs minimum TIER_A',
        description: 'Hero SKUs must use TIER_A ingredients',
        scope: 'CATEGORY',
        stringValue: 'TIER_A',
        isHardConstraint: true,
        isRegimeImmune: true,
        weightNormal: 'CRITICAL',
        weightSupplyShock: 'CRITICAL',
        weightDemandShock: 'CRITICAL',
        weightCompetitive: 'CRITICAL',
        weightRecovery: 'CRITICAL',
      },
    }),
    // VendorClass: Prohibited vendor dispatch block (hard, regime-immune)
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'VENDOR_CLASS',
        label: 'Prohibited vendor dispatch block',
        description: 'Block dispatch for PROHIBITED vendors',
        scope: 'VENDOR',
        stringValue: 'PROHIBITED',
        isHardConstraint: true,
        isRegimeImmune: true,
        weightNormal: 'CRITICAL',
        weightSupplyShock: 'CRITICAL',
        weightDemandShock: 'CRITICAL',
        weightCompetitive: 'CRITICAL',
        weightRecovery: 'CRITICAL',
      },
    }),
    // ServiceCeiling: Fulfilment rate floor 90%
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'SERVICE_CEILING',
        label: 'Fulfilment rate floor 90%',
        scope: 'UNIVERSAL',
        thresholdPct: '0.9000',
        comparisonOp: 'gte',
      },
    }),
    // ServiceCeiling: Prep time bakery 4hrs
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'SERVICE_CEILING',
        label: 'Bakery prep time ceiling 4hrs',
        scope: 'CATEGORY',
        category: 'BAKERY',
        thresholdValue: '4.0000',
        comparisonOp: 'lte',
      },
    }),
    // ShrinkageMetric: Near-expiry dispatch block < 10% shelf life
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'SHRINKAGE_METRIC',
        label: 'Near-expiry dispatch block <10% shelf life',
        scope: 'UNIVERSAL',
        thresholdPct: '0.1000',
        comparisonOp: 'lt',
        isHardConstraint: true,
        isRegimeImmune: true,
        weightNormal: 'CRITICAL',
        weightSupplyShock: 'CRITICAL',
        weightDemandShock: 'CRITICAL',
        weightCompetitive: 'CRITICAL',
        weightRecovery: 'CRITICAL',
      },
    }),
    // DiscountCap: Max 20% without founder approval (hard)
    prisma.tIGConstraint.create({
      data: {
        userId: admin.id,
        nodeType: 'DISCOUNT_CAP',
        label: 'Max 20% discount without founder approval',
        scope: 'UNIVERSAL',
        thresholdPct: '0.2000',
        comparisonOp: 'lte',
        isHardConstraint: true,
      },
    }),
  ]);

  const [
    bakeryCap,
    beveragesCap,
    _grainsCap,
    _sourZero,
    arabZero,
    bakeryMargin,
    _beveragesMargin,
    _flagshipMargin,
    bakeryWaste,
    _beveragesWaste,
    dairyWaste,
    _ingredientGradeHero,
    _prohibitedVendor,
    fulfilmentFloor,
    _bakeryPrep,
    _shrinkageBlock,
    _maxDiscountCap,
  ] = constraints;

  // 6. TIG Exceptions
  const now = new Date();
  await prisma.tIGException.createMany({
    data: [
      {
        userId: admin.id,
        constraintId: beveragesCap.id,
        description: 'Herbal Tea ecommerce platform discount',
        reasonCode: 'PRE_APPROVED_PLATFORM_DISCOUNT',
        approvedBy: 'Founder',
        approvedAt: now,
        expiresAt: addMonths(now, 3),
      },
    ],
  });

  // 7. OnboardingAnswers Q1–Q20 (simplified, representative)
  const onboardingData: { id: string; section: string; tigNodeType?: string; rawText: string }[] =
    [
      {
        id: 'Q1',
        section: 'Brand',
        tigNodeType: 'BRAND_POSITIONING',
        rawText: 'Koravo-operated brand positioned as premium urban bakery-cafe.',
      },
      {
        id: 'Q2',
        section: 'Brand',
        tigNodeType: 'OUTLET_PRIORITY',
        rawText: 'Flagship Mumbai and Delhi CP outlets are CRITICAL priority.',
      },
      {
        id: 'Q3',
        section: 'Brand',
        tigNodeType: 'QUALITY_STANDARD',
        rawText: 'FSSAI compliance mandatory; zero-tolerance on violations.',
      },
      {
        id: 'Q4',
        section: 'Brand',
        tigNodeType: 'INGREDIENT_GRADE',
        rawText: 'Hero SKUs must use Tier A ingredients only.',
      },
      {
        id: 'Q5',
        section: 'Brand',
        tigNodeType: 'DISCOUNT_POLICY',
        rawText: 'No deep-discount positioning; discount caps enforced per category.',
      },
      {
        id: 'Q6',
        section: 'Pricing',
        tigNodeType: 'DISCOUNT_CAP',
        rawText: 'Bakery 10%, Beverages 8%, Grains 20% category discount caps.',
      },
      {
        id: 'Q7',
        section: 'Pricing',
        tigNodeType: 'DISCOUNT_CAP',
        rawText: 'Hero SKUs Sourdough and Arabica Coffee are zero-discount.',
      },
      {
        id: 'Q8',
        section: 'Pricing',
        tigNodeType: 'DISCOUNT_CAP',
        rawText: 'Global discount hard cap at 20% without founder approval.',
      },
      {
        id: 'Q9',
        section: 'Pricing',
        tigNodeType: 'MARGIN_DEFINITION',
        rawText: 'Bakery margin floor 28%, Beverages 35%, Flagship outlet 32%.',
      },
      {
        id: 'Q10',
        section: 'Pricing',
        tigNodeType: 'MARGIN_DEFINITION',
        rawText: 'Loss-leader SKU White Bread is allowed near-zero margin.',
      },
      {
        id: 'Q11',
        section: 'Finance',
        tigNodeType: 'WASTE_TOLERANCE',
        rawText: 'Bakery waste tolerance 1.5% per batch; beverages 0.5%; dairy 2%.',
      },
      {
        id: 'Q12',
        section: 'Finance',
        tigNodeType: 'SHRINKAGE_METRIC',
        rawText: 'Near-expiry dispatch blocked if shelf life remaining <10%.',
      },
      {
        id: 'Q13',
        section: 'Finance',
        tigNodeType: 'REVENUE_AGGREGATE',
        rawText: 'Weekly revenue roll-ups used for TIG health dashboards.',
      },
      {
        id: 'Q14',
        section: 'Vendors',
        tigNodeType: 'VENDOR_CLASS',
        rawText: 'Prohibited vendors cannot be used for dispatch under any regime.',
      },
      {
        id: 'Q15',
        section: 'Vendors',
        tigNodeType: 'VENDOR_CLASS',
        rawText: 'Mynte (Flour) and Feedspan (Dairy) are APPROVED vendors.',
      },
      {
        id: 'Q16',
        section: 'Vendors',
        tigNodeType: 'VENDOR_CLASS',
        rawText: 'Pixonyx herbal tea is APPROVED across ecommerce channels.',
      },
      {
        id: 'Q17',
        section: 'Waste',
        tigNodeType: 'WASTE_TOLERANCE',
        rawText: 'Intentional quality rejections are tracked separately from spoilage.',
      },
      {
        id: 'Q18',
        section: 'Operations',
        tigNodeType: 'SERVICE_CEILING',
        rawText: 'Fulfilment rate floor 90% with ramp-up exceptions per outlet.',
      },
      {
        id: 'Q19',
        section: 'Operations',
        tigNodeType: 'SERVICE_CEILING',
        rawText: 'Bakery prep time ceiling 4 hours for long-ferment SKUs.',
      },
      {
        id: 'Q20',
        section: 'Outlets',
        tigNodeType: 'OUTLET_PRIORITY',
        rawText: 'Hyderabad outlet marked MONITORED with lower fulfilment during ramp-up.',
      },
    ];

  await prisma.onboardingAnswer.createMany({
    data: onboardingData.map((q) => ({
      userId: admin.id,
      questionId: q.id,
      questionSection: q.section,
      tigNodeType: q.tigNodeType as any,
      answer: { text: q.rawText },
      rawText: q.rawText,
      biasStatuses: {
        D1: 'VERIFIED',
        D2: 'PROVISIONAL',
        D3: 'VERIFIED',
        D4: 'PROVISIONAL',
        D5: 'RISK',
      },
      isVerified: true,
      requiresReview: false,
    })),
    skipDuplicates: true,
  });

  // 8. ActivityLog entries
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        type: 'csv_upload',
        description: 'Uploaded sales_oct.csv with 12,430 rows.',
        metadata: {
          filename: 'sales_oct.csv',
          rows: 12430,
        },
        severity: 'info',
        locationId: locMum.id,
      },
      {
        userId: admin.id,
        type: 'sage_run',
        description: 'SAGE MarginAnalysis run completed for Oct 2025.',
        metadata: {
          program: 'MarginAnalysis',
          period: '2025-10-01/2025-10-31',
        },
        severity: 'success',
      },
      {
        userId: admin.id,
        type: 'constraint_check',
        description: 'TIG constraints evaluated against latest sales data.',
        metadata: {
          constraintsChecked: 15,
        },
        severity: 'info',
      },
      {
        userId: admin.id,
        type: 'regime_detected',
        description: 'Potential supply shock detected for flour inputs.',
        metadata: {
          regimeType: 'SUPPLY_SHOCK',
          signal: 'Flour COGS +18% vs baseline',
        },
        severity: 'warning',
      },
      {
        userId: admin.id,
        type: 'deviation_opened',
        description: 'Critical discount violation flagged for Bakery.',
        metadata: {
          nodeType: 'DISCOUNT_CAP',
          category: 'BAKERY',
        },
        severity: 'error',
      },
    ],
  });

  // 9. Sample InsightCards
  const [insight1, insight2, insight3] = await prisma.$transaction([
    prisma.insightCard.create({
      data: {
        userId: admin.id,
        title: 'Bakery margins stable with minor waste hotspots',
        body:
          'Bakery category margins held at 30.8% vs a 28% floor, with two outlets showing elevated waste on hero SKUs. No hard constraints breached.',
        category: 'MARGIN',
        severity: 'MEDIUM',
        confidenceScore: '0.9100',
        regimeContext: 'NORMAL',
        constraintStatuses: [
          { nodeType: 'MARGIN_DEFINITION', status: 'HEALTHY' },
          { nodeType: 'WASTE_TOLERANCE', status: 'EXPLORATORY' },
        ],
        recommendedAction:
          'Tighten production planning for White Bread in Mumbai Flagship and Delhi CP over the next 7 days.',
        approverRequired: false,
        dspyProgramUsed: 'MarginAnalysis',
        langGraphRunId: 'LG_RUN_001',
        graphRagQueryId: 'GRAG_Q_001',
        contextBriefingRaw: {
          kpi_delta: { margin_pct: 0.308 },
          constraints: { healthy: 12, exploratory: 3 },
        },
        llmEndpointUsed: 'chat_narration',
        llmModelName: 'claude-sonnet-4.1',
      },
    }),
    prisma.insightCard.create({
      data: {
        userId: admin.id,
        title: 'Platform-led discount pressure on Herbal Tea',
        body:
          'Ecommerce partners are running 18–20% discounts on Herbal Tea, within pre-approved exceptions but compressing category margins by 2.3ppts.',
        category: 'DISCOUNT',
        severity: 'HIGH',
        confidenceScore: '0.8800',
        regimeContext: 'COMPETITIVE_PRESSURE',
        constraintStatuses: [
          { nodeType: 'DISCOUNT_CAP', status: 'SUPPRESSED' },
          { nodeType: 'MARGIN_DEFINITION', status: 'HEALTHY' },
        ],
        recommendedAction:
          'Monitor Herbal Tea margins weekly; revoke platform discount exception if blended margin drops below 30%.',
        approverRequired: true,
        dspyProgramUsed: 'DiscountViolationCheck',
        langGraphRunId: 'LG_RUN_002',
        graphRagQueryId: 'GRAG_Q_002',
        contextBriefingRaw: {
          sku: 'HERB-001',
          discount_window: [0.18, 0.2],
        },
        llmEndpointUsed: 'analytics_narration',
        llmModelName: 'claude-sonnet-4.1',
      },
    }),
    prisma.insightCard.create({
      data: {
        userId: admin.id,
        title: 'Emerging flour cost pressure with stable revenue',
        body:
          'Flour COGS increased by 16% over three weeks while flagship bakery revenue remained flat, indicating early supply-side pressure without demand erosion.',
        category: 'REGIME',
        severity: 'EXPLORATORY',
        confidenceScore: '0.8200',
        regimeContext: 'SUPPLY_SHOCK_CANDIDATE',
        constraintStatuses: [
          { nodeType: 'REGIME_DETECTION', status: 'EXPLORATORY' },
        ],
        recommendedAction:
          'Hold prices for hero SKUs, review vendor mix, and re-evaluate regime classification in 14 days.',
        approverRequired: false,
        dspyProgramUsed: 'RegimeShiftDetection',
        langGraphRunId: 'LG_RUN_003',
        graphRagQueryId: 'GRAG_Q_003',
        contextBriefingRaw: {
          signal: 'flour_cogs_spike',
          weeks: 3,
        },
        llmEndpointUsed: 'summary_narration',
        llmModelName: 'gpt-4.5-mini',
      },
    }),
  ]);

  // 10. Sample Recommendations
  await prisma.recommendation.createMany({
    data: [
      {
        userId: admin.id,
        title: 'Rebalance bakery production across Mumbai and Delhi',
        body:
          'Shift 8–10% of White Bread production from Mumbai Flagship to Delhi CP to reduce waste while protecting availability.',
        category: 'WASTE',
        impact: 'HIGH',
        source: 'csv',
        constraintRef: bakeryWaste.id,
        dspyProgram: 'WasteInference',
        status: 'NEW',
      },
      {
        userId: admin.id,
        title: 'Tighten discount guardrails on Bakery during weekends',
        body:
          'Limit weekend bakery discounting to 5% to protect margins while monitoring conversion on hero SKUs.',
        category: 'DISCOUNT',
        impact: 'MEDIUM',
        source: 'scheduled',
        constraintRef: bakeryCap.id,
        dspyProgram: 'DiscountViolationCheck',
        status: 'NEW',
      },
      {
        userId: admin.id,
        title: 'Introduce limited-time bundle for Arabica Coffee',
        body:
          'Create a bundle with Herbal Tea to defend premium positioning without direct discounting on Arabica Coffee.',
        category: 'REVENUE',
        impact: 'MEDIUM',
        source: 'regime',
        constraintRef: arabZero.id,
        dspyProgram: 'MarginAnalysis',
        status: 'NEW',
      },
      {
        userId: admin.id,
        title: 'Review vendor mix for dairy inputs',
        body:
          'Benchmark Feedspan pricing and reliability against local dairy vendors to reduce exposure to single-supplier risk.',
        category: 'VENDOR',
        impact: 'LOW',
        source: 'csv',
        constraintRef: dairyWaste.id,
        dspyProgram: 'VendorRiskScoring',
        status: 'NEW',
      },
      {
        userId: admin.id,
        title: 'Define clear ramp-up SLAs for monitored outlets',
        body:
          'Set explicit fulfilment and prep-time expectations for new outlets to prevent silent erosion of ServiceCeiling constraints.',
        category: 'FULFILMENT',
        impact: 'HIGH',
        source: 'chat',
        constraintRef: fulfilmentFloor.id,
        dspyProgram: 'FulfilmentScoring',
        status: 'NEW',
      },
    ],
  });

  // 11. SeasonalityCalendar (Diwali, LOC_MUM_01)
  await prisma.seasonalityCalendar.create({
    data: {
      userId: admin.id,
      locationId: locMum.id,
      label: 'Diwali',
      calendarType: 'demand_peak',
      isNaturalDemand: true,
      startDate: new Date('2025-10-20'),
      endDate: new Date('2025-11-15'),
      revenueImpactPct: '0.2500',
      supplyImpactPct: '0.1200',
      isRecurringAnnual: true,
      notes: 'Elevated demand for bakery and gifting SKUs across flagship outlet.',
    },
  });

  // 12. ModelEndpoint records with empty URLs
  await prisma.modelEndpoint.createMany({
    data: [
      {
        componentType: 'chat_narration',
        label: 'Chat Narration (default)',
        url: '',
        encryptedKey: null,
        modelName: null,
        isActive: true,
      },
      {
        componentType: 'analytics_narration',
        label: 'Analytics Narration (default)',
        url: '',
        encryptedKey: null,
        modelName: null,
        isActive: true,
      },
      {
        componentType: 'summary_narration',
        label: 'Summary Narration (default)',
        url: '',
        encryptedKey: null,
        modelName: null,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

