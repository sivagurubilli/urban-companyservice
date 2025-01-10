let appUtils = require("../utils/appUtils");
const { Chat } = require("../models");

exports.saveChatDetails = async (req, res, next) => {
  try {
    const { channelId, expertId, userId } = Object.assign(req.body);
    let requiredField = { channelId };
    let requestDataValid = appUtils.isRequestDataValid(requiredField, "1234");
    if (requestDataValid !== true) throw Error(requestDataValid);
    let chatData = new Chat({
      channelId,
      userId,
      expertId,
    });
    chatData = await chatData.save();

    if (!chatData._id) {
      throw Error("chat data not stored");
    }
    res.send(
      appUtils.responseJson(
        1,
        {
          chatData: chatData,
          chatId: chatData._id,
        },
        "chat initiated"
      )
    );
  } catch (error) {
    let statusCode = error.statusCode ? error.statusCode : 500;
    let msg = error.msg ? error.msg : "chat request failed";
    res.status(statusCode).send(appUtils.responseJson(0, [], msg, error));
  }
};
