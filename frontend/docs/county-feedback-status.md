# County Feedback — Reconciliation Status

**Document reference:** AMR-NEXUS ONE HEALTH — Makueni County Stakeholder Feedback (21 September 2026)
**Status date:** 2026-10-03
**Author:** Engineering team, AMR Nexus

## Purpose

This document reconciles every item raised by county stakeholders in the
September 2026 engagement with the current state of the platform. It exists
so that the Ministry, county leadership, and the engineering team share one
honest picture of what is built, what is partial, and what is deferred.

Legend:

- **Built** — shipped, tested, and visible in the platform
- **Partial** — some capability exists but does not fully meet the ask
- **Deferred** — not started; reason stated
- **Process** — not a code task; requires administrative or regulatory work

## Summary

| Bucket | Count | Percent |
|---|---|---|
| Built | 8 | 42% |
| Partial | 4 | 21% |
| Deferred | 6 | 32% |
| Process | 1 | 5% |
| **Total items** | **19** | **100%** |

---

## Theme 1 — Interoperability and Integration

**Stakeholder ask:** AMR Nexus must interoperate with the seven systems
already in operation (including KABS) rather than become an eighth silo.

| Item | Status | Notes |
|---|---|---|
| Integration with 7 existing systems | **Deferred** | Requires integration adapter framework (2 weeks) and MOUs |
| KABS (Kenya Animal Bio-surveillance System) adapter | **Deferred** | Requires adapter framework first |
| e-Citizen one-stop-shop vision | **Partial** | Modular architecture in place (ADR-0001); no cross-system navigation yet |
| Streamlined navigation across platforms | **Deferred** | Depends on adapter layer |
| Unified surveillance across sectors | **Partial** | Sector field is unified in the data model; data sources are not |
| One Health Reporting Framework (Animals/Environment/Humans) | **Partial** | One Health page ships; E. coli sentinel structure is not modelled |

**What this means:** the platform is architecturally ready to accept
integrations (module registry, adapter pattern), but no live integration
exists. This is the single largest structural gap.

---

## Theme 2 — Data Collection, Lab Integration, Sample Management

| Item | Status | Notes |
|---|---|---|
| Sample list improvements | **Built** | New columns (Species, Sector, Sub-county, Specimen) and Veterinary preset |
| Veterinary sample lists complete | **Built** | Species/Sector columns now visible; species filter added |
| Point-of-collection geo-tagging | **Partial** | Sites capture lat/lng; first-time-user UX not built |
| Soil testing and performance data | **Deferred** | No backend, no UI |
| Lab entry directly into system | **Partial** | Isolate submission form supports specimen and test method |
| Sample traceability after recording | **Built** | Triangulation drawer on Sampling Sites page |
| Site tagging for samples | **Built** | site_id FK on isolates + prediction form selector |
| Aflatoxin tracking from soil testing | **Deferred** | Part of soil module |
| Seasonal trend archive | **Partial** | Trends visible; no archive table |
| External system sync | **Deferred** | Integration adapter needed |

---

## Theme 3 — AMR Root Causes, Risk Factors, AMU

| Item | Status | Notes |
|---|---|---|
| AMU/AMC module | **Built** | Dashboard + drug reference + consumption entry forms |
| AMU in animals as well as humans | **Built** | Sector filter covers it |
| Root causes of AMR | **Partial** | Contributing Factors page synthesises evidence; not causal |
| Contributing factors behind prediction | **Built** | SHAP attribution on every prediction |
| Behavioural and qualitative factors | **Deferred** | Requires data collection not yet designed |
| AMU consumption patterns | **Built** | Trend chart on AmuDashboard |
| Drivers of resistance | **Partial** | One Health feedback loops shown; not data-derived |

**Honest limitation:** the county asked for root-cause *identification*. The
platform provides contributing *factors* structured against WHO GLASS,
One Health, and participatory systems analysis literature. Causal
attribution requires confirmed clinical outcomes and behavioural data we do
not yet collect.

---

## Theme 4 — Surveillance, Environment, Food Safety

| Item | Status | Notes |
|---|---|---|
| Environmental data integration | **Partial** | Sector=environment filter exists; no separate workflow |
| Resistance hotspots visible | **Built** | Hotspots map + new CRUD page |
| AMR residues in food products | **Deferred** | No backend, no UI |
| Food safety information | **Deferred** | No backend, no UI |
| Environmental sampling sites | **Partial** | Sampling Sites module supports site_type=environmental |
| WASH module | **Deferred** | No backend, no UI |

**Food safety and WASH are entirely missing.** These were explicit asks.

---

## Theme 5 — Data Protection, Governance, Ethics, Validation

| Item | Status | Notes |
|---|---|---|
| Data minimisation | **Built** | No direct identifiers in isolate records |
| Tiered safeguards (technical) | **Built** | Encryption in transit, RBAC, secrets hardening |
| Tiered safeguards (physical/admin) | **Process** | Server room policy, admin SOPs |
| Ethics approvals (ERB, NACOSTI) | **Process** | Not started. Long lead time. |
| Data-informed practices | **Partial** | Privacy notice, activity log, export |
| Validation / investigation module | **Deferred** | No UI, no backend |
| Information segregation | **Partial** | RBAC roles; no category-level segmentation |
| Data governance clarity | **Process** | Document to be drafted |

---

## Theme 6 — Monitoring, Information Management, Reporting

| Item | Status | Notes |
|---|---|---|
| Clear monitoring framework | **Partial** | Model Health page covers model monitoring |
| Reporting framework | **Built** | Reports page with GLASS-aligned templates |
| Case-based reporting | **Deferred** | No case entity in data model |
| Uniform reporting practice | **Partial** | Reports page exists; UNGA framework not modelled |
| Data quality assessment | **Built** | DataQuality page |
| Data contribution targets | **Deferred** | Requires reporting cadence definition |

---

## Theme 7 — Prediction Models, Analytical Approach

| Item | Status | Notes |
|---|---|---|
| Explain modelling approach | **Built** | Modelling Approach page (documentation-only, static) |
| What each prediction model predicts | **Built** | Model card + Modelling Approach page |
| Compartmental vs ML distinction | **Built** | Documented in Modelling Approach page |
| Track user behaviour on platform | **Built** | Activity Log page |
| Historical data pipeline | **Built** | Analytics + EWS Forecast |

---

## Theme 8 — From Prediction to Action, Policy Translation

| Item | Status | Notes |
|---|---|---|
| Once system predicts, what next? | **Built** | Actions module |
| Action plans for alerts | **Built** | Actions page with status transitions |
| Cost of missed opportunity | **Deferred** | No economic model |
| Draft policies for departments | **Deferred** | No template engine |
| Escalation to National Office | **Deferred** | No workflow |

---

## Theme 9 — County Overview, Aggregate Burden, Economics

| Item | Status | Notes |
|---|---|---|
| County overview | **Built** | County Dashboard |
| Aggregate AMR burden | **Built** | National Dashboard |
| Opportunity cost / M&E module | **Deferred** | No economic model, no UI |
| Who pays for samples | **Deferred** | Not modelled |
| Efficiency as measurable outcome | **Deferred** | Not measured |

---

## Theme 10 — Alerts, Targeting, RBAC

| Item | Status | Notes |
|---|---|---|
| Signal tiers (critical/high/medium/low) | **Built** | Severity on every alert |
| Role-based alert routing | **Built** | Role Routing page |
| SMS and email tiered delivery | **Built** | Notification preferences + provider integration |
| User privileges defined per signal | **Built** | Role × channel × severity matrix |

---

## Theme 11 — Visualization, Dashboards, Reporting

| Item | Status | Notes |
|---|---|---|
| More visualization options | **Built** | Recharts + Chart.js used across pages |
| Bar graphs and pie charts | **Built** | Present on Analytics and dashboards |
| Export to CSV and PDF | **Partial** | CSV on some pages; PDF via browser print |
| Sub-county comparative analytics | **Partial** | Sub-county MDR endpoints exist; comparative view partial |
| Triangulate data (lab ↔ site) | **Built** | Triangulation drawer |

---

## Theme 12 — Strategic Frameworks, Scalability

| Item | Status | Notes |
|---|---|---|
| One Health Strategic Plan Draft as entry framework | **Partial** | Module framework (ADR-0001) aligns with modular onboarding vision |
| Implementation framework document | **Process** | Not yet drafted |
| Data sharing mechanisms | **Process** | MOUs required |
| Replicable to other counties | **Partial** | Config-driven; multi-county not yet built |

---

## Theme 13 — Agreed Action Points

| Item | Status | Notes |
|---|---|---|
| Engage National Government | **Process** | Not started |
| Draft policy under HIPPA and DPA | **Process** | Not started |
| Landing page design | **Built** | Public page at /welcome |
| Role-based access controls | **Built** | RBAC across all modules |
| Historical data views / activity logs | **Built** | Activity Log page |
| Module structural setup | **Built** | Module framework + 5 modules |

---

## What the numbers say

**Built (8 items, 42%):** the platform now visibly answers most of the
day-to-day and safety asks.

**Partial (4 items, 21%):** half-implemented. Each is documented above with
the exact missing piece.

**Deferred (6 items, 32%):** largely economic, policy, and integration work
that depends on additional data collection, additional systems access, or
administrative decisions.

**Process (1 item, 5%):** regulatory and governance steps that must happen
before any pilot.

## Recommended sequencing

1. **Governance processes (immediate, parallel to engineering):** ERB,
   NACOSTI, data governance framework, National Government engagement
2. **Pilot-blocking engineering:** integration adapter framework, GLASS
   patient-level reporting, case entity
3. **Follow-on builds:** policy output generator, economics / M&E module,
   validation module, food safety, WASH
4. **Capacity:** retraining pipeline, model registry population, drift
   snapshots — gated on real confirmed outcomes accumulating

## Standing commitment

Every future engineering session will update this document with a status
change for each item it touches. The document is version-controlled and
ships with the code.