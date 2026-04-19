# Quick progress check for overnight import
# Usage: .\scripts\check-import-progress.ps1

Write-Host "`n📊 Import Progress Check" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Product counts
$productCount = npx tsx -e @"
import {config} from 'dotenv'; 
config({path:'.env.local'}); 
import {createClient} from '@supabase/supabase-js'; 
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}); 
Promise.all([
  s.from('products').select('*',{count:'exact',head:true}),
  s.from('products').select('id').is('dsld_id', null).then(r=>r.data?.length || 0),
  s.from('product_ingredients').select('product_id').then(r=>new Set(r.data?.map(i=>i.product_id)).size)
]).then(([total, noDsld, withIngredients])=>{
  console.log(JSON.stringify({
    total: total.count,
    noDsld: noDsld,
    withIngredients: withIngredients,
    withoutIngredients: total.count - withIngredients
  }))
})
"@

$stats = $productCount | ConvertFrom-Json

Write-Host "Total Products:        $($stats.total)" -ForegroundColor Green
Write-Host "With Ingredients:      $($stats.withIngredients) ($([math]::Round($stats.withIngredients/$stats.total*100,1))%)" -ForegroundColor $(if($stats.withIngredients/$stats.total -gt 0.9){'Green'}else{'Yellow'})
Write-Host "Without Ingredients:   $($stats.withoutIngredients)" -ForegroundColor $(if($stats.withoutIngredients -lt 20){'Green'}else{'Yellow'})
Write-Host "Without DSLD ID:       $($stats.noDsld)" -ForegroundColor Gray

# Recent imports
Write-Host "`n📅 Recent Imports (last hour):" -ForegroundColor Cyan
npx tsx -e @"
import {config} from 'dotenv'; 
config({path:'.env.local'}); 
import {createClient} from '@supabase/supabase-js'; 
const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}); 
s.from('products')
  .select('brand,name,created_at')
  .gte('created_at', new Date(Date.now()-3600000).toISOString())
  .order('created_at', {ascending:false})
  .limit(10)
  .then(r=>{
    if(!r.data?.length) console.log('   No imports in last hour');
    else r.data.forEach(p=>console.log('   '+new Date(p.created_at).toLocaleTimeString()+' - '+p.brand+' '+p.name))
  })
"@

Write-Host "`n✅ Check complete`n" -ForegroundColor Green
