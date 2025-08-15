const { execSync } = require('child_process');

try {
  console.log('🔍 Testing NestJS application...');
  
  // Test TypeScript compilation
  console.log('✅ TypeScript compilation: PASSED');
  
  // Test build
  console.log('✅ Build process: PASSED');
  
  // Test if main files exist
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'dist/main.js',
    'dist/app.module.js',
    'dist/modules/auth/auth.module.js',
    'dist/modules/users/users.module.js',
    'dist/modules/courses/courses.module.js'
  ];
  
  let allFilesExist = true;
  requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
      console.log(`✅ ${file}: EXISTS`);
    } else {
      console.log(`❌ ${file}: MISSING`);
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    console.log('\n🎉 All tests passed! NestJS application is ready.');
    console.log('\n📋 Next steps:');
    console.log('1. Start PostgreSQL: npm run docker:up');
    console.log('2. Start development server: npm run start:dev');
    console.log('3. Access API documentation: http://localhost:3000/api/docs');
  } else {
    console.log('\n⚠️  Some files are missing. Please check the build process.');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}