// handlers/getResults.js
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { success, error, logError } = require('../utils/middleware');
require('dotenv').config();

exports.handler = async (event) => {
  // 결과 ID 확인
  const id = event.pathParameters?.id;
  if (!id) {
    return error(400, 'Missing result ID');
  }
  
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id,
    },
  };
  
  try {
    const result = await dynamoDb.get(params).promise();
    
    if (result.Item) {
      // 민감한 정보 제거 (필요에 따라)
      const { answers, ...safeData } = result.Item;
      
      return success(safeData);
    } else {
      return error(404, 'Result not found');
    }
  } catch (err) {
    logError('getResults handler', err);
    return error(500, 'Could not retrieve result', { message: err.message });
  }
};