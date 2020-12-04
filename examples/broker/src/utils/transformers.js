const Bson = require('bson')

exports.temperature = (payload) => {
  const jsonMessage = JSON.parse(payload.toString())

  return {
    _id: new Bson.ObjectID(),
    sensorType: String(jsonMessage.sensorType),
    sensorId: String(jsonMessage.sensorId),
    value: Number(jsonMessage.tempCelsius),
    timestamp: Number(jsonMessage.timestamp)
  }
}

exports.humidity = (payload) => {
  const jsonMessage = JSON.parse(payload.toString())

  return {
    _id: new Bson.ObjectID(),
    sensorType: String(jsonMessage.sensorType),
    sensorId: String(jsonMessage.sensorId),
    value: Number(jsonMessage.relHumidity),
    timestamp: Number(jsonMessage.timestamp)
  }
}
