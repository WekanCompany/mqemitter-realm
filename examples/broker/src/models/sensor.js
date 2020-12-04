module.exports = {
  name: 'sensorData',
  properties: {
    _id: 'objectId',
    sensorId: 'string',
    sensorType: 'string?',
    timestamp: 'int',
    value: 'double'
  },
  primaryKey: '_id'
}
