/**
 * 媒体库筛选性能测试脚本
 * 测试筛选响应时间是否 < 300ms
 * 
 * 使用方法:
 * node scripts/test-filter-performance.js
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// 测试场景
const testScenarios = [
  {
    name: '搜索测试',
    url: `${BASE_URL}/api/media/search?q=test`,
  },
  {
    name: '存储类型筛选',
    url: `${BASE_URL}/api/media/search?category=local`,
  },
  {
    name: '发布状态筛选',
    url: `${BASE_URL}/api/media/search?status=published`,
  },
  {
    name: '媒体类型筛选',
    url: `${BASE_URL}/api/media/search?type=image`,
  },
  {
    name: '组合筛选',
    url: `${BASE_URL}/api/media/search?category=local&status=published&type=image`,
  },
  {
    name: '日期范围筛选',
    url: `${BASE_URL}/api/media/search?dateFrom=2024-01-01&dateTo=2024-12-31`,
  },
  {
    name: 'Hero 标记筛选',
    url: `${BASE_URL}/api/media/search?hero=yes`,
  },
  {
    name: '全维度组合筛选',
    url: `${BASE_URL}/api/media/search?q=photo&category=local&status=published&type=image&dateFrom=2024-01-01&dateTo=2024-12-31&hero=yes`,
  },
];

// 性能测试函数
async function testPerformance(scenario) {
  const results = [];
  const iterations = 5; // 每个场景测试 5 次

  console.log(`\n测试场景: ${scenario.name}`);
  console.log(`URL: ${scenario.url}`);

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(scenario.url);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        results.push(duration);
        console.log(`  第 ${i + 1} 次: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`  第 ${i + 1} 次: 请求失败 (${response.status})`);
      }
    } catch (error) {
      console.log(`  第 ${i + 1} 次: 错误 - ${error.message}`);
    }
  }

  if (results.length > 0) {
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);
    
    console.log(`\n  统计结果:`);
    console.log(`    平均: ${avg.toFixed(2)}ms`);
    console.log(`    最小: ${min.toFixed(2)}ms`);
    console.log(`    最大: ${max.toFixed(2)}ms`);
    console.log(`    目标: < 300ms`);
    console.log(`    状态: ${avg < 300 ? '✅ 通过' : '❌ 未达标'}`);
    
    return { scenario: scenario.name, avg, min, max, passed: avg < 300 };
  }
  
  return { scenario: scenario.name, avg: 0, min: 0, max: 0, passed: false };
}

// 主测试函数
async function runTests() {
  console.log('='.repeat(60));
  console.log('媒体库筛选性能测试');
  console.log('='.repeat(60));
  console.log(`测试目标: 响应时间 < 300ms`);
  console.log(`测试 URL: ${BASE_URL}`);
  
  const allResults = [];
  
  for (const scenario of testScenarios) {
    const result = await testPerformance(scenario);
    allResults.push(result);
    
    // 等待 1 秒再进行下一个测试
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('测试汇总报告');
  console.log('='.repeat(60));
  
  const passedCount = allResults.filter(r => r.passed).length;
  const totalCount = allResults.length;
  
  console.log(`\n总测试场景: ${totalCount}`);
  console.log(`通过: ${passedCount}`);
  console.log(`未通过: ${totalCount - passedCount}`);
  console.log(`通过率: ${((passedCount / totalCount) * 100).toFixed(1)}%`);
  
  console.log('\n详细结果:');
  allResults.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${result.scenario}: ${result.avg.toFixed(2)}ms`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  // 返回退出码
  process.exit(passedCount === totalCount ? 0 : 1);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
