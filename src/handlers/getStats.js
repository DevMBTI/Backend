const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { success, error, logError } = require('../utils/middleware');
require('dotenv').config();

exports.handler = async (event) => {
  try {
    // 쿼리 파라미터에서 필터 옵션 가져오기
    const queryParams = event.queryStringParameters || {};
    const days = parseInt(queryParams.days) || 7; // 기본값 7일
    
    // 날짜 범위 계산
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = startDate.toISOString();
    
    // 전체 결과 가져오기 (기본 설정)
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      ProjectionExpression: "id, userName, result.recommendedPath, result.scores, createdAt",
      Limit: 1000
    };
    
    const data = await dynamoDb.scan(params).promise();
    
    if (!data.Items || data.Items.length === 0) {
      return success({ 
        count: 0,
        pathDistribution: {},
        timeDistribution: {},
        averageScores: {}
      });
    }
    
    // 날짜별 필터링 (메모리에서 처리)
    const filteredItems = data.Items.filter(item => {
      if (!item.createdAt) return false;
      return item.createdAt >= startTimestamp;
    });
    
    // 경로별 분포 계산
    const pathDistribution = filteredItems.reduce((acc, item) => {
      const path = item.result?.recommendedPath || 'unknown';
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {});
    
    // 시간별 분포 계산
    const timeDistribution = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      timeDistribution[dateString] = 0;
    }
    
    filteredItems.forEach(item => {
      if (!item.createdAt) return;
      
      const date = new Date(item.createdAt);
      const dateString = date.toISOString().split('T')[0];
      
      if (timeDistribution[dateString] !== undefined) {
        timeDistribution[dateString]++;
      }
    });
    
    // 평균 점수 계산
    let totalScores = {
      frontend: 0,
      backend: 0,
      fullstack: 0,
      data: 0,
      devops: 0
    };
    
    let scoreCount = 0;
    filteredItems.forEach(item => {
      if (item.result?.scores) {
        Object.entries(item.result.scores).forEach(([key, value]) => {
          if (totalScores[key] !== undefined) {
            totalScores[key] += value;
          }
        });
        scoreCount++;
      }
    });
    
    const averageScores = {};
    if (scoreCount > 0) {
      Object.keys(totalScores).forEach(key => {
        averageScores[key] = Math.round(totalScores[key] / scoreCount);
      });
    }
    
    // 익명화된 최근 결과 목록 (사용자 이름만 포함)
    const recentResults = filteredItems
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        userName: item.userName,
        recommendedPath: item.result?.recommendedPath || 'unknown',
        createdAt: item.createdAt
      }));
    
    return success({
      count: filteredItems.length,
      totalCount: data.Items.length,
      pathDistribution,
      timeDistribution,
      averageScores,
      recentResults,
      periodDays: days
    });
  } catch (err) {
    logError('getStats handler', err);
    return error(500, 'Could not retrieve statistics', { message: err.message });
  }
}; 