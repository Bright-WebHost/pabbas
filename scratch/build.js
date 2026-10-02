const d = $input.first().json;
const inbound = $('Extract Inbound Message').first().json;
const response = d.response || {};

return [{
  json: {
    ...response,

    customer_phone:
      response.customer_phone ||
      d.customer_phone ||
      inbound.phone ||
      '',

    customer_name:
      response.customer_name ||
      d.customer_name ||
      inbound.customer_name ||
      '',

    channel_user_id:
      inbound.channel_user_id || null,

    log_text:
      response.log_text || '',

    outgoing:
      response.outgoing || {
        type: 'text',
        text: { body: '' }
      }
  }
}];