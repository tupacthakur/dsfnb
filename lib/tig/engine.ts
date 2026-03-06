import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export enum ConstraintWeight {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INACTIVE = 'INACTIVE',
}

export enum DeviationSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  EXPLORATORY = 'EXPLORATORY',
}

export enum DeviationStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  SUPPRESSED = 'SUPPRESSED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export enum RegimeType {
  SUPPLY_SHOCK = 'SUPPLY_SHOCK',
  DEMAND_SHOCK = 'DEMAND_SHOCK',
  COMPETITIVE_PRESSURE = 'COMPETITIVE_PRESSURE',
  RECOVERY_PHASE = 'RECOVERY_PHASE',
  STRUCTURAL_CHANGE = 'STRUCTURAL_CHANGE',
  NORMAL = 'NORMAL',
}

export enum RegimeStatus {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  RESOLVED = 'RESOLVED',
}

export interface ConstraintCheckContext {
  locationId?: string;
  productId?: string;
  channel?: string;
  category?: string;
  discountPct?: number;
  marginPct?: number;
  wastePct?: number;
  ingredientTier?: string;
  supplierClass?: string;
  fulfilmentRate?: number;
  prepMinutes?: number;
  shelfLifeRemainingPct?: number;
}

export interface ConstraintCheckResult {
  constraintId: string;
  nodeType: string;
  status: 'HEALTHY' | 'VIOLATED' | 'SUPPRESSED' | 'EXPLORATORY';
  effectiveWeight: ConstraintWeight;
  deviationId?: string;
  details?: Record<string, unknown>;
}

export async function getEffectiveWeight(
  constraint: any,
  regimeType: RegimeType,
): Promise<ConstraintWeight> {
  if (constraint.isRegimeImmune) {
    return ConstraintWeight.CRITICAL;
  }

  switch (regimeType) {
    case RegimeType.SUPPLY_SHOCK:
      return constraint.weightSupplyShock;
    case RegimeType.DEMAND_SHOCK:
      return constraint.weightDemandShock;
    case RegimeType.COMPETITIVE_PRESSURE:
      return constraint.weightCompetitive;
    case RegimeType.RECOVERY_PHASE:
      return constraint.weightRecovery;
    case RegimeType.STRUCTURAL_CHANGE:
    case RegimeType.NORMAL:
    default:
      return constraint.weightNormal;
  }
}

export async function detectActiveRegime(
  userId: string,
): Promise<any | null> {
  const event = await prisma.regimeEvent.findFirst({
    where: {
      userId,
      status: RegimeStatus.ACTIVE,
    },
    orderBy: { detectedAt: 'desc' },
  });

  return event ?? null;
}

export async function evaluateConstraint(
  constraint: any,
  context: ConstraintCheckContext,
  currentWeight: ConstraintWeight,
): Promise<ConstraintCheckResult> {
  let status: ConstraintCheckResult['status'] = 'HEALTHY';
  const details: Record<string, unknown> = {};

  switch (constraint.nodeType) {
    case 'DISCOUNT_CAP': {
      const pct = context.discountPct ?? 0;
      const threshold = constraint.thresholdPct?.toNumber() ?? 0;
      const ok = pct <= threshold;
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.discountPct = pct;
      details.thresholdPct = threshold;
      break;
    }
    case 'MARGIN_DEFINITION': {
      const pct = context.marginPct ?? 0;
      const threshold = constraint.thresholdPct?.toNumber() ?? 0;
      const ok = pct >= threshold;
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.marginPct = pct;
      details.thresholdPct = threshold;
      break;
    }
    case 'WASTE_TOLERANCE': {
      const pct = context.wastePct ?? 0;
      const threshold = constraint.thresholdPct?.toNumber() ?? 0;
      const ok = pct <= threshold;
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.wastePct = pct;
      details.thresholdPct = threshold;
      break;
    }
    case 'INGREDIENT_GRADE': {
      const requiredTier = constraint.stringValue ?? '';
      const actualTier = context.ingredientTier ?? '';
      const ok = !requiredTier || actualTier >= requiredTier;
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.requiredTier = requiredTier;
      details.actualTier = actualTier;
      break;
    }
    case 'VENDOR_CLASS': {
      const cls = context.supplierClass ?? '';
      const ok = cls !== 'PROHIBITED' && cls !== 'UNDEFINED';
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.supplierClass = cls;
      break;
    }
    case 'SERVICE_CEILING': {
      if (constraint.thresholdPct != null && context.fulfilmentRate != null) {
        const threshold = constraint.thresholdPct.toNumber();
        const ok = context.fulfilmentRate >= threshold;
        status = ok ? 'HEALTHY' : 'VIOLATED';
        details.fulfilmentRate = context.fulfilmentRate;
        details.thresholdPct = threshold;
      } else if (
        constraint.thresholdValue != null &&
        context.prepMinutes != null
      ) {
        const threshold = constraint.thresholdValue.toNumber();
        const ok = context.prepMinutes <= threshold;
        status = ok ? 'HEALTHY' : 'VIOLATED';
        details.prepMinutes = context.prepMinutes;
        details.thresholdMinutes = threshold;
      }
      break;
    }
    case 'SHRINKAGE_METRIC': {
      const pct = context.shelfLifeRemainingPct ?? 1;
      const threshold = constraint.thresholdPct?.toNumber() ?? 0.1;
      const ok = pct > threshold;
      status = ok ? 'HEALTHY' : 'VIOLATED';
      details.shelfLifeRemainingPct = pct;
      details.thresholdPct = threshold;
      break;
    }
    default:
      status = 'EXPLORATORY';
  }

  return {
    constraintId: constraint.id,
    nodeType: constraint.nodeType,
    status,
    effectiveWeight: currentWeight,
    details,
  };
}

export async function checkConstraints(params: {
  userId: string;
  context: ConstraintCheckContext;
  regimeType?: RegimeType;
}): Promise<ConstraintCheckResult[]> {
  const { userId, context } = params;
  const regime =
    params.regimeType ?? (await detectActiveRegime(userId))?.regimeType ??
    RegimeType.NORMAL;

  const constraints = await prisma.tIGConstraint.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
  });

  const results: ConstraintCheckResult[] = [];
  const hardViolations: string[] = [];

  for (const c of constraints) {
    const weight = await getEffectiveWeight(c, regime);
    const result = await evaluateConstraint(c, context, weight);

    // Log
    await prisma.tIGCheckLog.create({
      data: {
        constraintId: c.id,
        checkResult: result.status,
        deviationId: null,
        contextData: JSON.parse(JSON.stringify(context)),
        confidenceScore: 1.0,
        regimeActive: regime,
      },
    });

    if (result.status === 'VIOLATED' && c.isHardConstraint) {
      const deviation = await prisma.deviation.create({
        data: {
          constraintId: c.id,
          locationId: context.locationId,
          severity: DeviationSeverity.CRITICAL,
          title: c.label,
          description: c.description ?? 'Hard constraint violated',
          detectedValue:
            (typeof result.details?.detectedValue === 'number'
              ? result.details.detectedValue
              : context.marginPct ?? context.discountPct ?? null),
          thresholdValue:
            (typeof result.details?.thresholdValue === 'number'
              ? result.details.thresholdValue
              : c.thresholdPct ?? c.thresholdValue ?? null),
          financialImpactPaise: null,
          status: DeviationStatus.OPEN,
          isCoupled: false,
          coupledIds: [],
          regimeContext: regime,
        },
      });
      result.deviationId = deviation.id;
      hardViolations.push(deviation.id);
    }

    results.push(result);
  }

  results.sort((a, b) => {
    const weightOrder: ConstraintWeight[] = [
      ConstraintWeight.CRITICAL,
      ConstraintWeight.HIGH,
      ConstraintWeight.MEDIUM,
      ConstraintWeight.LOW,
      ConstraintWeight.INACTIVE,
    ];
    return (
      weightOrder.indexOf(a.effectiveWeight) -
      weightOrder.indexOf(b.effectiveWeight)
    );
  });

  return results;
}

export async function triggerRegimeDetection(
  userId: string,
  newData: Record<string, unknown>,
): Promise<void> {
  // Placeholder orchestration: log an exploratory regime event if certain flags present
  const signals = newData;
  const shouldOpenEvent = Boolean(signals);

  if (!shouldOpenEvent) return;

  await prisma.regimeEvent.create({
    data: {
      userId,
      regimeType: RegimeType.SUPPLY_SHOCK,
      status: RegimeStatus.PENDING_CONFIRMATION,
      triggerSignals: JSON.parse(JSON.stringify(signals)),
      weightOverrides: undefined,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId,
      type: 'regime_detected',
      description: 'Potential regime shift detected',
      metadata: JSON.parse(JSON.stringify(signals)),
      severity: 'warning',
    },
  });
}

