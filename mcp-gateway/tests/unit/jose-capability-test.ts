import * as jose from 'jose';

async function testJose() {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
  
  const jwt = await new jose.SignJWT({ test: 'payload' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  
  const { payload } = await jose.jwtVerify(jwt, publicKey);
  
  console.log('✅ jose library works!');
  return true;
}

testJose().then(() => process.exit(0)).catch(e => {
  console.error('❌ jose failed:', e.message);
  process.exit(1);
});
