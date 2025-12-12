const axios = require('axios');

jest.setTimeout(20000);

test('sandbox run endpoint returns stdout', async () => {
  const response = await axios.post('http://localhost:3001/run', { cmd: 'echo safe' });
  expect(response.data).toHaveProperty('stdout');
});
