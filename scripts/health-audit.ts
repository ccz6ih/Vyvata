import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables BEFORE reading them
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Read environment variables after dotenv is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client
const getSupabase = () => createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface SubsystemStatus {
  name: string;
  status: 'green' | 'yellow' | 'red';
  lastActivity: string;
  issueCount: number;
  details: string;
}

interface StuckRecords {
  stuckFlags: number;
  unscoredProducts: number;
  productsWithoutIngredients: number;
  manufacturersWithoutCerts: number;
}

async function auditTableHealth(): Promise<SubsystemStatus[]> {
  const supabase = getSupabase();
  const statuses: SubsystemStatus[] = [];

  // Check products table
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (!products || products.length === 0) {
      statuses.push({
        name: 'Product Import',
        status: 'red',
        lastActivity: 'Never',
        issueCount: 1,
        details: 'No products found in database'
      });
    } else {
      statuses.push({
        name: 'Product Import',
        status: 'green',
        lastActivity: new Date(products[0].created_at).toISOString(),
        issueCount: 0,
        details: `${count} products in database`
      });
    }
  } catch (error) {
    statuses.push({
      name: 'Product Import',
      status: 'red',
      lastActivity: 'Error',
      issueCount: 1,
      details: `Cannot query products table: ${error}`
    });
  }

  // Check product scores
  try {
    const { data: scores } = await supabase
      .from('product_scores')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    const { count: scoreCount } = await supabase
      .from('product_scores')
      .select('*', { count: 'exact', head: true });

    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const coverage = productCount ? (scoreCount ?? 0) / productCount : 0;

    statuses.push({
      name: 'Scoring Pipeline',
      status: coverage >= 0.95 ? 'green' : coverage >= 0.8 ? 'yellow' : 'red',
      lastActivity: scores?.[0]?.updated_at ? new Date(scores[0].updated_at).toISOString() : 'Never',
      issueCount: coverage < 0.95 ? 1 : 0,
      details: `${scoreCount}/${productCount} products scored (${Math.round(coverage * 100)}%)`
    });
  } catch (error) {
    statuses.push({
      name: 'Scoring Pipeline',
      status: 'red',
      lastActivity: 'Error',
      issueCount: 1,
      details: `Cannot query scores: ${error}`
    });
  }

  // Check compliance flags
  try {
    const { data: flags } = await supabase
      .from('compliance_flags')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from('compliance_flags')
      .select('*', { count: 'exact', head: true });

    if (!flags || flags.length === 0) {
      statuses.push({
        name: 'Compliance Flags',
        status: 'red',
        lastActivity: 'Never',
        issueCount: 1,
        details: 'No compliance flags found — scraper may have never run'
      });
    } else {
      const daysSinceWrite = (Date.now() - new Date(flags[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
      statuses.push({
        name: 'Compliance Flags',
        status: daysSinceWrite > 2 ? 'red' : daysSinceWrite > 1 ? 'yellow' : 'green',
        lastActivity: new Date(flags[0].created_at).toISOString(),
        issueCount: daysSinceWrite > 1 ? 1 : 0,
        details: `${count} total flags, last write ${Math.floor(daysSinceWrite)} days ago (expected: daily)`
      });
    }
  } catch (error) {
    statuses.push({
      name: 'Compliance Flags',
      status: 'red',
      lastActivity: 'Error',
      issueCount: 1,
      details: `Cannot query flags: ${error}`
    });
  }

  // Check certifications
  try {
    const { data: certs } = await supabase
      .from('certifications')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true });

    if (!certs || certs.length === 0) {
      statuses.push({
        name: 'Certifications',
        status: 'yellow',
        lastActivity: 'Never',
        issueCount: 1,
        details: 'No product certifications found'
      });
    } else {
      const daysSinceWrite = (Date.now() - new Date(certs[0].created_at).getTime()) / (1000 * 60 * 60 * 24);
      statuses.push({
        name: 'Certifications',
        status: (count ?? 0) < 10 ? 'yellow' : 'green',
        lastActivity: new Date(certs[0].created_at).toISOString(),
        issueCount: (count ?? 0) < 10 ? 1 : 0,
        details: `${count} product certifications, last write ${Math.floor(daysSinceWrite)} days ago`
      });
    }
  } catch (error) {
    statuses.push({
      name: 'Certifications',
      status: 'yellow',
      lastActivity: 'Error',
      issueCount: 1,
      details: `Cannot query certifications: ${error}`
    });
  }

  // Check manufacturer certifications
  try {
    const { data: mfgCerts } = await supabase
      .from('manufacturer_certifications')
      .select('id, synced_at')
      .order('synced_at', { ascending: false })
      .limit(1);

    const { count } = await supabase
      .from('manufacturer_certifications')
      .select('*', { count: 'exact', head: true });

    if (!mfgCerts || mfgCerts.length === 0) {
      statuses.push({
        name: 'Manufacturer Certs',
        status: 'yellow',
        lastActivity: 'Never',
        issueCount: 1,
        details: 'No manufacturer certifications found'
      });
    } else {
      const daysSinceSync = mfgCerts[0].synced_at 
        ? (Date.now() - new Date(mfgCerts[0].synced_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999;
      
      statuses.push({
        name: 'Manufacturer Certs',
        status: daysSinceSync > 60 ? 'yellow' : 'green',
        lastActivity: mfgCerts[0].synced_at ? new Date(mfgCerts[0].synced_at).toISOString() : 'Never',
        issueCount: daysSinceSync > 60 ? 1 : 0,
        details: `${count} manufacturer certifications, last sync ${Math.floor(daysSinceSync)} days ago (expected: monthly)`
      });
    }
  } catch (error) {
    statuses.push({
      name: 'Manufacturer Certs',
      status: 'yellow',
      lastActivity: 'Error',
      issueCount: 1,
      details: `Cannot query manufacturer certs: ${error}`
    });
  }

  return statuses;
}

async function auditStuckRecords(): Promise<StuckRecords> {
  const supabase = getSupabase();
  
  try {
    // Stuck compliance flags
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count: stuckFlags } = await supabase
      .from('compliance_flags')
      .select('*', { count: 'exact', head: true })
      .eq('review_status', 'pending')
      .lt('created_at', fourteenDaysAgo);

    // Products without scores
    const { data: products } = await supabase
      .from('products')
      .select('id');
    
    const { data: scores } = await supabase
      .from('product_scores')
      .select('product_id');

    const productIds = new Set(products?.map(p => p.id) ?? []);
    const scoredIds = new Set(scores?.map(s => s.product_id) ?? []);
    const unscoredProducts = products?.filter(p => !scoredIds.has(p.id)).length ?? 0;

    // Products without ingredients
    const { data: ingredients } = await supabase
      .from('product_ingredients')
      .select('product_id');

    const productsWithIngredients = new Set(ingredients?.map(i => i.product_id) ?? []);
    const productsWithoutIngredients = products?.filter(p => !productsWithIngredients.has(p.id)).length ?? 0;

    // Manufacturers without certifications
    const { data: manufacturers } = await supabase
      .from('manufacturers')
      .select('id');

    const { data: mfgCerts } = await supabase
      .from('manufacturer_certifications')
      .select('manufacturer_id');

    const manufacturersWithCerts = new Set(mfgCerts?.map(c => c.manufacturer_id) ?? []);
    const manufacturersWithoutCerts = manufacturers?.filter(m => !manufacturersWithCerts.has(m.id)).length ?? 0;

    return {
      stuckFlags: stuckFlags ?? 0,
      unscoredProducts,
      productsWithoutIngredients,
      manufacturersWithoutCerts
    };
  } catch (error) {
    console.error('Error auditing stuck records:', error);
    return {
      stuckFlags: 0,
      unscoredProducts: 0,
      productsWithoutIngredients: 0,
      manufacturersWithoutCerts: 0
    };
  }
}

async function auditCronJobs() {
  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelJsonPath)) {
    return {
      configured: [],
      warnings: ['vercel.json not found']
    };
  }

  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
    const crons = vercelConfig.crons || [];

    const cronStatus = crons.map((cron: any) => {
      const routePath = path.join(process.cwd(), 'src', 'app', cron.path, 'route.ts');
      const exists = fs.existsSync(routePath);

      return {
        path: cron.path,
        schedule: cron.schedule,
        fileExists: exists,
        status: exists ? 'configured' : 'missing-route'
      };
    });

    return {
      configured: cronStatus,
      warnings: cronStatus.filter(c => c.status === 'missing-route').map(c => `Route missing: ${c.path}`)
    };
  } catch (error) {
    return {
      configured: [],
      warnings: [`Error reading vercel.json: ${error}`]
    };
  }
}

async function generateReport() {
  const today = new Date().toISOString().split('T')[0];
  const reportsDir = path.join(process.cwd(), '.agents', 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `supabase-health-${today}.md`);

  console.log('🔍 Running Supabase health audit...\n');

  const statuses = await auditTableHealth();
  const stuck = await auditStuckRecords();
  const crons = await auditCronJobs();

  const overallStatus = statuses.some(s => s.status === 'red') ? 'red' :
                        statuses.some(s => s.status === 'yellow') ? 'yellow' : 'green';

  const statusEmoji = (status: string) => 
    status === 'green' ? '🟢 Green' :
    status === 'yellow' ? '🟡 Yellow' : '🔴 Red';

  const criticalCount = statuses.filter(s => s.status === 'red').length;
  const warningCount = statuses.filter(s => s.status === 'yellow').length;

  const report = `# Supabase Health Audit — ${today}

**Audit completed:** ${new Date().toISOString()}  
**Overall status:** ${statusEmoji(overallStatus)} (${criticalCount} critical, ${warningCount} warnings)

---

## 🎯 Executive Summary

| Subsystem | Status | Last Activity | Issue Count |
|-----------|--------|---------------|-------------|
${statuses.map(s => `| ${s.name} | ${statusEmoji(s.status)} | ${s.lastActivity.split('T')[0]} | ${s.issueCount} |`).join('\n')}

**Critical Issues:** ${criticalCount}  
**Warnings:** ${warningCount}  

---

## 🔍 Detailed Findings

${statuses.map(s => `### ${s.name}
- **Status:** ${statusEmoji(s.status)}
- **Details:** ${s.details}
`).join('\n')}

---

## 🚨 Stuck Records

- **Compliance flags pending >14 days:** ${stuck.stuckFlags}
- **Products without scores:** ${stuck.unscoredProducts}
- **Products without ingredients:** ${stuck.productsWithoutIngredients}
- **Manufacturers without certifications:** ${stuck.manufacturersWithoutCerts}

${stuck.productsWithoutIngredients > 0 ? `
⚠️ **Action needed:** ${stuck.productsWithoutIngredients} products have no ingredients. Run cleanup:
\`\`\`bash
npx tsx scripts/cleanup-empty-products.ts
\`\`\`
` : ''}

---

## ⏰ Cron Job Configuration

**Configured crons in vercel.json:** ${crons.configured.length}

${crons.configured.map(c => `- \`${c.path}\` (${c.schedule}) — ${c.fileExists ? '✅ Route exists' : '❌ Route missing'}`).join('\n')}

${crons.warnings.length > 0 ? `
⚠️ **Cron warnings:**
${crons.warnings.map(w => `- ${w}`).join('\n')}
` : ''}

---

## 🔧 Recommended Actions

${statuses.filter(s => s.issueCount > 0).map((s, i) => `${i + 1}. **[${s.status === 'red' ? 'P0' : 'P1'}]** ${s.name}: ${s.details}`).join('\n')}

${stuck.stuckFlags > 0 ? `\n${statuses.length + 1}. **[P2]** Review ${stuck.stuckFlags} compliance flags pending >14 days` : ''}

---

## 📊 Quick Stats

- **Total products:** Check products table
- **Score coverage:** See Scoring Pipeline status above
- **Active cron jobs:** ${crons.configured.filter(c => c.fileExists).length}/${crons.configured.length}
- **Stuck records:** ${stuck.stuckFlags + stuck.unscoredProducts + stuck.productsWithoutIngredients}

---

**Next audit:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} (weekly recommended)
`;

  fs.writeFileSync(reportPath, report);
  
  console.log(`\n✅ Health report saved to: ${reportPath}\n`);
  console.log('━'.repeat(80));
  console.log(report);
  console.log('━'.repeat(80));
  console.log(`\n📊 Overall Status: ${statusEmoji(overallStatus)}`);
  console.log(`🔴 Critical: ${criticalCount}`);
  console.log(`🟡 Warnings: ${warningCount}`);
  console.log(`🟢 Healthy: ${statuses.filter(s => s.status === 'green').length}`);
  console.log('\n');
}

generateReport().catch(console.error);
