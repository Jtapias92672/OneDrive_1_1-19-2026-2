#!/usr/bin/env node
/**
 * Epic 06 Functional Verification
 * Tests correctness, not coverage metrics
 */

const { ReactGenerator } = require('./dist/index.js');

const mockFrame = {
  id: 'frame-1',
  name: 'TestComponent',
  type: 'FRAME',
  visible: true,
  children: [{
    id: 'text-1',
    name: 'Label',
    type: 'TEXT',
    visible: true,
    textContent: 'Hello World',
    children: [],
  }],
  semantic: { type: 'button', confidence: 0.9, element: 'button' },
  layout: { type: 'flex', direction: 'horizontal', gap: 8, padding: { top: 8, right: 16, bottom: 8, left: 16 } },
  styles: { fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }], borderRadius: 4 },
  bounds: { x: 0, y: 0, width: 100, height: 40 },
};

const mockDesign = {
  version: '1.0.0',
  metadata: { name: 'Test', fileKey: 'test', lastModified: '2026-01-24' },
  pages: [{ id: 'p1', name: 'Main', isMain: true, frames: [mockFrame] }],
  components: [],
  componentSets: [],
  tokens: { colors: {}, typography: {}, spacing: {}, radii: {}, shadows: {} },
  assets: [],
  stats: {},
};

const results = {
  stylingApproaches: {},
  componentFormats: {},
  errorHandling: {},
  edgeCases: {},
  issues: [],
};

async function testStylingApproaches() {
  console.log('\n=== 1. STYLING APPROACHES ===\n');

  const approaches = ['tailwind', 'css-modules', 'styled-components', 'emotion', 'sass', 'vanilla', 'inline'];

  for (const approach of approaches) {
    try {
      const generator = new ReactGenerator({ stylingApproach: approach, typescript: true });
      const result = await generator.generate(mockDesign);

      if (result.components.length > 0) {
        const comp = result.components[0];
        const hasCode = comp.code && comp.code.length > 50;
        const hasStyles = approach === 'tailwind'
          ? comp.code.includes('className')
          : (comp.styleCode || comp.code.includes('styled') || comp.code.includes('style'));

        results.stylingApproaches[approach] = {
          generates: true,
          hasCode,
          hasStyles,
          codeLength: comp.code.length,
          errors: result.errors.length,
        };

        const status = hasCode ? '✅' : '❌';
        console.log(`${status} ${approach}: ${comp.code.length} chars, ${result.errors.length} errors`);
      } else {
        results.stylingApproaches[approach] = { generates: false };
        console.log(`❌ ${approach}: No component generated`);
        results.issues.push(`${approach}: Failed to generate component`);
      }
    } catch (err) {
      results.stylingApproaches[approach] = { generates: false, error: err.message };
      console.log(`❌ ${approach}: CRASHED - ${err.message}`);
      results.issues.push(`${approach}: Crashed with ${err.message}`);
    }
  }
}

async function testComponentFormats() {
  console.log('\n=== 2. COMPONENT FORMATS ===\n');

  const formats = ['functional', 'function', 'forwardRef'];

  for (const format of formats) {
    try {
      const generator = new ReactGenerator({ outputFormat: format, typescript: true });
      const result = await generator.generate(mockDesign);

      if (result.components.length > 0) {
        const code = result.components[0].code;

        let isCorrectFormat = false;
        let formatEvidence = '';

        switch (format) {
          case 'functional':
            isCorrectFormat = code.includes('FC<') || code.includes(': FC');
            formatEvidence = 'FC<Props>';
            break;
          case 'function':
            isCorrectFormat = code.includes('function ') && !code.includes('FC<');
            formatEvidence = 'function Component()';
            break;
          case 'forwardRef':
            isCorrectFormat = code.includes('forwardRef');
            formatEvidence = 'forwardRef<';
            break;
        }

        results.componentFormats[format] = {
          generates: true,
          correctFormat: isCorrectFormat,
          codeLength: code.length,
        };

        const status = isCorrectFormat ? '✅' : '⚠️';
        console.log(`${status} ${format}: ${isCorrectFormat ? 'Correct' : 'Missing'} (expected: ${formatEvidence})`);

        if (!isCorrectFormat) {
          results.issues.push(`${format}: Format marker not found in output`);
        }
      }
    } catch (err) {
      results.componentFormats[format] = { generates: false, error: err.message };
      console.log(`❌ ${format}: CRASHED - ${err.message}`);
      results.issues.push(`${format}: Crashed with ${err.message}`);
    }
  }
}

async function testErrorHandling() {
  console.log('\n=== 3. ERROR HANDLING ===\n');

  const testCases = [
    { name: 'null input', input: null },
    { name: 'undefined input', input: undefined },
    { name: 'empty object', input: {} },
    { name: 'missing pages', input: { version: '1.0.0', metadata: {} } },
    { name: 'empty pages', input: { ...mockDesign, pages: [] } },
    { name: 'invisible frame', input: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [{ ...mockFrame, visible: false }] }] } },
  ];

  for (const { name, input } of testCases) {
    try {
      const generator = new ReactGenerator();
      const result = await generator.generate(input);

      const graceful = result !== undefined && !result.crashed;
      results.errorHandling[name] = { graceful, errors: result?.errors?.length || 0 };

      console.log(`✅ ${name}: Handled gracefully (${result?.errors?.length || 0} errors recorded)`);
    } catch (err) {
      // Descriptive errors (Design input required, etc.) = proper validation
      // TypeError/Cannot read = crash
      const isValidationError = err.message.includes('required') ||
                                err.message.includes('must have') ||
                                err.message.includes('must be');
      const isCrash = err.message.includes('Cannot read') ||
                      err.message.includes('TypeError') ||
                      err.message.includes('undefined is not');

      if (isValidationError && !isCrash) {
        results.errorHandling[name] = { graceful: true, validationError: true, error: err.message };
        console.log(`✅ ${name}: Proper validation error - "${err.message}"`);
      } else {
        results.errorHandling[name] = { graceful: false, crashed: true, error: err.message };
        console.log(`❌ ${name}: Crash - ${err.message.substring(0, 50)}`);
        results.issues.push(`${name}: Crashes instead of graceful handling`);
      }
    }
  }
}

async function testEdgeCases() {
  console.log('\n=== 4. EDGE CASES ===\n');

  // Deep nesting
  const deepFrame = JSON.parse(JSON.stringify(mockFrame));
  let current = deepFrame;
  for (let i = 0; i < 10; i++) {
    current.children = [{ ...mockFrame, id: `nested-${i}`, name: `Level${i}`, children: [] }];
    current = current.children[0];
  }

  const edgeCases = [
    { name: 'deep nesting (10 levels)', design: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [deepFrame] }] } },
    { name: 'special chars in name', design: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [{ ...mockFrame, name: 'Button@#$%' }] }] } },
    { name: 'numeric name', design: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [{ ...mockFrame, name: '123Button' }] }] } },
    { name: 'empty name', design: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [{ ...mockFrame, name: '' }] }] } },
    { name: 'unicode name', design: { ...mockDesign, pages: [{ ...mockDesign.pages[0], frames: [{ ...mockFrame, name: 'Botón日本語' }] }] } },
  ];

  for (const { name, design } of edgeCases) {
    try {
      const generator = new ReactGenerator();
      const result = await generator.generate(design);

      if (result.components.length > 0) {
        const code = result.components[0].code;
        const compiles = code.includes('export') && code.includes('return');
        results.edgeCases[name] = { handled: true, compiles };
        console.log(`${compiles ? '✅' : '⚠️'} ${name}: ${compiles ? 'Generates valid code' : 'Code may have issues'}`);
      } else {
        results.edgeCases[name] = { handled: true, compiles: false };
        console.log(`⚠️ ${name}: No component (may be intentional)`);
      }
    } catch (err) {
      results.edgeCases[name] = { handled: false, error: err.message };
      console.log(`❌ ${name}: CRASHED - ${err.message.substring(0, 50)}`);
      results.issues.push(`Edge case "${name}": ${err.message}`);
    }
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('ENTERPRISE-GRADE ASSESSMENT');
  console.log('='.repeat(60) + '\n');

  // Styling approaches
  const stylingTotal = Object.keys(results.stylingApproaches).length;
  const stylingPass = Object.values(results.stylingApproaches).filter(r => r.generates && r.hasCode).length;
  console.log(`Styling Approaches: ${stylingPass}/${stylingTotal} working`);

  // Component formats
  const formatTotal = Object.keys(results.componentFormats).length;
  const formatPass = Object.values(results.componentFormats).filter(r => r.generates).length;
  const formatCorrect = Object.values(results.componentFormats).filter(r => r.correctFormat).length;
  console.log(`Component Formats:  ${formatPass}/${formatTotal} generate, ${formatCorrect}/${formatTotal} correct format`);

  // Error handling
  const errorTotal = Object.keys(results.errorHandling).length;
  const errorGraceful = Object.values(results.errorHandling).filter(r => r.graceful).length;
  console.log(`Error Handling:     ${errorGraceful}/${errorTotal} graceful`);

  // Edge cases
  const edgeTotal = Object.keys(results.edgeCases).length;
  const edgeHandled = Object.values(results.edgeCases).filter(r => r.handled).length;
  console.log(`Edge Cases:         ${edgeHandled}/${edgeTotal} handled`);

  console.log('\n--- Issues Found ---');
  if (results.issues.length === 0) {
    console.log('None');
  } else {
    results.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
  }

  // Final verdict
  const criticalIssues = results.issues.filter(i => i.includes('CRASHED') || i.includes('Unexpected')).length;
  const totalChecks = stylingTotal + formatTotal + errorTotal + edgeTotal;
  const passedChecks = stylingPass + formatPass + errorGraceful + edgeHandled;

  console.log('\n--- Verdict ---');
  console.log(`Checks passed: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);
  console.log(`Critical issues: ${criticalIssues}`);
  console.log(`Total issues: ${results.issues.length}`);

  if (criticalIssues === 0 && passedChecks / totalChecks >= 0.8) {
    console.log('\n✅ ENTERPRISE-GRADE: Yes (functional, needs hardening)');
  } else if (criticalIssues === 0) {
    console.log('\n⚠️ ENTERPRISE-GRADE: Partial (functional but gaps exist)');
  } else {
    console.log('\n❌ ENTERPRISE-GRADE: No (critical issues found)');
  }
}

async function main() {
  console.log('Epic 06 Functional Verification');
  console.log('Focus: Correctness, not coverage metrics\n');

  await testStylingApproaches();
  await testComponentFormats();
  await testErrorHandling();
  await testEdgeCases();
  await generateReport();
}

main().catch(console.error);
