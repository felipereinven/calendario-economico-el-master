/**
 * Script de prueba para el sistema de traducción de eventos económicos
 * Ejecutar con: npx tsx test-translations.ts
 */

import { translateEventName } from './server/utils/event-taxonomy';

// Casos de prueba con eventos reales de la API
const testCases = [
  // Casos completos (NIVEL 1)
  { input: "Non-Farm Payrolls", expected: "Nóminas No Agrícolas" },
  { input: "Initial Jobless Claims", expected: "Solicitudes Iniciales de Desempleo" },
  { input: "Consumer Price Index", expected: "Índice de Precios al Consumidor" },
  { input: "NFIB Business Optimism Index", expected: "Índice de Optimismo Empresarial NFIB" },
  { input: "Manufacturing PMI", expected: "PMI Manufacturero" },
  
  // Casos con variaciones (case-insensitive)
  { input: "manufacturing pmi", expected: "PMI Manufacturero" },
  { input: "CONSUMER PRICE INDEX", expected: "Índice de Precios al Consumidor" },
  
  // Casos compuestos (NIVEL 2)
  { input: "Core Retail Sales", expected: "Ventas Minoristas Subyacentes" },
  { input: "Fed Interest Rate Decision", expected: "Decisión de Tasa de Interés de la Fed" },
  { input: "GDP Growth Rate QoQ", expected: "Tasa de Crecimiento del PIB Trimestral" },
  
  // Casos que requieren traducción por partes (NIVEL 3)
  { input: "Unemployment Rate", expected: "Tasa de Desempleo" },
  { input: "Trade Balance", expected: "Balanza Comercial" },
  { input: "Industrial Production MoM", expected: "Producción Industrial Mensual" },
  
  // Casos complejos con múltiples términos
  { input: "Average Hourly Earnings YoY", expected: "Ganancias por Hora Promedio Anual" },
  { input: "Building Permits MoM", expected: "Permisos de Construcción Mensual" },
  { input: "Claimant Count Change", expected: "Cambio en el Conteo de Solicitantes" },
  
  // Casos con abreviaturas
  { input: "CPI YoY", expected: "IPC Anual" },
  { input: "PPI MoM", expected: "IPP Mensual" },
  { input: "GDP QoQ", expected: "PIB Trimestral" },
  
  // Casos de energía
  { input: "Crude Oil Inventories", expected: "Inventarios de Petróleo Crudo" },
  { input: "Natural Gas Storage", expected: "Almacenamiento de Gas Natural" },
  
  // Casos de bonos
  { input: "10-Year Note Auction", expected: "Subasta de Notas a 10 Años" },
  { input: "30-Year Bond Auction", expected: "Subasta de Bonos a 30 Años" },
];

console.log('🧪 PROBANDO SISTEMA DE TRADUCCIÓN DE EVENTOS ECONÓMICOS\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
  const result = translateEventName(input);
  const success = result === expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: PASÓ`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: FALLÓ`);
    console.log(`   Input:    "${input}"`);
    console.log(`   Expected: "${expected}"`);
    console.log(`   Got:      "${result}"`);
  }
});

console.log('='.repeat(80));
console.log(`\n📊 RESULTADOS: ${passed}/${testCases.length} pruebas pasaron`);
console.log(`   ✅ Exitosas: ${passed}`);
console.log(`   ❌ Fallidas: ${failed}`);
console.log(`   📈 Tasa de éxito: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

if (failed === 0) {
  console.log('🎉 ¡Todas las pruebas pasaron exitosamente!\n');
  process.exit(0);
} else {
  console.log('⚠️  Algunas pruebas fallaron. Revisa los detalles arriba.\n');
  process.exit(1);
}
