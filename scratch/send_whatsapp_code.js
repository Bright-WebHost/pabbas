={{ JSON.stringify((function() {
  const req = {
    from: "+919180348124",
    to: $json.phone
  };
  
  if ($json.send_receipt) {
    req.type = 'image';
    req.image = {
      link: 'https://pabbas-one.vercel.app/api/receipt?order_number=' + $json.order_number,
      caption: $json.message
    };
  } else if ($json.message_type === 'interactive') {
    req.type = 'interactive';
    req.interactive = {
      type: 'button',
      body: { text: $json.message },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'accept_' + $json.order_number,
              title: $json.interactive_button || 'Accept'
            }
          }
        ]
      }
    };
  } else {
    req.type = 'text';
    req.text = {
      body: $json.message
    };
  }
  
  return req;
})()) }}
