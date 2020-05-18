Stripe.setPublishableKey('pk_test_fPkqgPQLIjZ2LlI7ecM7jqAl00zWYTwdgL');

var $form = $("#checkout-form");

$form.submit(function(event){
	$("#payment-error").addClass("d-none");
	$form.find("button").prop("disabled", true);
	Stripe.card.createToken({
  		number: $("#cc-number").val(),
		cvc: $("#cc-cvv").val(),
	    exp_month: $("#cc-expiration-mm").val(),
	    exp_year: $("#cc-expiration-yy").val(),
		name: $("#cc-name").val()
		}, stripeResponseHandler);
	return false;
});

function stripeResponseHandler(status, response) {


  if (response.error) { // Problem!

    // Show the errors on the form
    $("#payment-error").text(response.error.message);
	$("#payment-error").removeClass("d-none");
    $form.find('button').prop('disabled', false); // Re-enable submission

  } else { // Token was created!

    // Get the token ID:
    var token = response.id;

    // Insert the token into the form so it gets submitted to the server:
    $form.append($('<input type="hidden" name="stripeToken" />').val(token));

    // Submit the form:
    $form.get(0).submit();

  }
}
