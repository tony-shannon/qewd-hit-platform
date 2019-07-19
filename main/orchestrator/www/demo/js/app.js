function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function deleteCookie(name) {
  document.cookie = name + '=;path=/;Max-Age=-99999999;';
}

function getHeaders() {
  return {
    authorization: 'Bearer ' + getCookie('JSESSIONID')
  };
}

$(document).ready(function() {

  var jwt;
  var patient;

  $('#header').hide();
  $('#whenLoggedIn').hide();
  $('#editBtn').hide();
  $('#mpiBtn').show();
  $('#demographicsForm').hide();
  $('#newPatient').hide();
  $('#allergyForm').hide();

  // fire off the /auth/redirect request every time
  // index.html is loaded

  // the oidc-client will respond with either a redirect to the
  //  oidc-provider, or will return authenticated: true

  var jwt = getCookie('JSESSIONID');
  var request = {
    url: '/auth/redirect',
    data: {
      //client_id: 'admin',
      client_id: 'test_client',
      scope: 'openid profile email'
    }
  };
  if (jwt && jwt !== '') {
    request.headers = {
      authorization: 'Bearer ' + jwt
    };
  }

  $.ajax(request)
  .done(function(data) {
    console.log('**** got ' + JSON.stringify(data));
    if (data.authenticated) {

      // user is authenticated, so begin display

      $('#header').show();
      $('#demographicsForm').hide();
      $('#whenLoggedIn').show();

      jwt = jwt_decode(data.token);
      console.log('JWT = ' + JSON.stringify(jwt, null, 2));

      $('#welcome').text('Welcome ' + jwt.firstName + ' ' + jwt.lastName);

    }
    else if (data.redirectURL) {

      // user not authenticated, so redirect to
      // OIDC Provider
      window.location = data.redirectURL;
      //console.log('redirectURL = ' + redirectURL);
    }
  });

  $('#logoutBtn').on('click', function(e) {
    $('#whenLoggedIn').hide();
    $.ajax({
      url: '/auth/logout?client_id=test_client',
      headers: getHeaders()
    })
    .done(function(data) {
      //console.log('logout response: ' + JSON.stringify(data, null, 2));
      if (data.redirectURL) {
        deleteCookie('JSESSIONID');
        window.location = data.redirectURL;
      }
    });
  });

  $('#mpiBtn').on('click', function(e) {
    $('#contentTitle').text("Fetching demographics from FHIR MPI service. Please wait...");
    $.ajax({
      url: '/mpi/Patient',
      method: 'GET',
      headers: getHeaders()
    })
    .done(function(data) {
      console.log('mpi response: ' + JSON.stringify(data, null, 2));
      $('#demographicsForm').hide();
      $('#allergyForm').hide();
      $('#editBtn').show();
      $('#mpiBtn').hide();
      patient = data.patient;
      $('#content').show();
      $('#contentTitle').text("Demographics (FHIR)");
      $('#content').text(JSON.stringify(data.patient, null, 2));  
    })
    .fail(function(error) {
      //console.log('mpi error: ' + JSON.stringify(error, null, 2));
      if (error.responseJSON.error === 'The specified Patient Id does not exist') {
        $('#contentTitle').text("Your Demographics Data Could Not be Found");
        $('#firstNames').val(jwt.firstName);
        $('#lastName').val(jwt.lastName);
        $('#telecom').val(jwt.openid.mobileNumber);
        //var pieces = jwt.openid.dob.split('/');
        //var dob = pieces[2] + '-' + pieces[1] + '-' + pieces[0];
        //$('#birthDate').val(dob);
        $('#birthDate').val('');
        $('#country').val('United Kingdom');
        $('#demographicsForm').show();
        $('#editBtn').hide();
        $('#mpiBtn').hide();
        $('#newPatient').show();
      }
    });
  });

  $('#saveMpiBtn').on('click', function(e) {
    var givenNames = $('#firstNames').val().split(' '); 

    var data = {
      name: {
        family: $('#lastName').val(),
        given: givenNames,
        prefix: $('#prefix').val()
      },
      telecom: $('#telecom').val(),
      gender: $('#gender').val(),
      birthDate: $('#birthDate').val(),
      address: {
        line: $('#address_line').val(),
        city: $('#city').val(),
        district: $('#district').val(),
        postalCode: $('#postalCode').val(),
        country: $('#country').val(),
      }
    };

    var message = {
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      headers: getHeaders()
    };

    if (patient) {
      message.url = '/mpi/Patient';
      message.method = 'PUT';
    }
    else {
      message.url = '/mpi/Patient';
      message.method = 'POST';
    }

    $.ajax(message)
    .done(function(data) {
      console.log('mpi response: ' + JSON.stringify(data, null, 2));
      // re-fetch data
      $('#mpiBtn').click();
    })
    .fail(function(error) {
      console.log('mpi error: ' + error.responseJSON.error);
      alert(error.responseJSON.error);
      $('#demographicsForm').hide();
      $('#editBtn').show();
    });
  });

  $('#editBtn').on('click', function(e) {
    var fnArr = patient.name[0].given;
    $('#firstNames').val(fnArr.join(' '));
    $('#lastName').val(patient.name[0].family);
    $('#telecom').val(patient.telecom);
    //var pieces = patient.birthDate.split('/');
    //var dob = pieces[2] + '-' + pieces[1] + '-' + pieces[0];
    $('#birthDate').val(patient.birthDate);
    $('#address_line').val(patient.address[0].line[0]);
    $('#city').val(patient.address[0].city);
    $('#district').val(patient.address[0].district);
    $('#postalCode').val(patient.address[0].postalCode);
    $('#country').val(patient.address[0].country);

    $('#demographicsForm').show();
    $('#content').hide();
    $('#allergyForm').hide();
    $('#editBtn').hide();
    $('#mpiBtn').hide();
    $('#newPatient').hide();
    $('#contentTitle').text("Edit Demographics Data");
  });

  $('#cancelEditBtn').on('click', function(e) {
    $('#demographicsForm').hide();
    $('#allergyForm').hide();
    $('#mpiBtn').show();
    $('#editBtn').hide();
    $('#content').show();    
    $('#contentTitle').text("");
    $('#content').text("");
  });


  $('#getAllergiesBtn').on('click', function(e) {
    console.log('get allergies..');
    $('#contentTitle').text("Fetching allergies from OpenEHR. Please wait...");
    $.ajax({
      url: '/openehr/heading/allergies/' + jwt.openid.userId,
      method: 'GET',
      headers: getHeaders()
    })
    .done(function(data) {
      $('#demographicsForm').hide();
      $('#allergyForm').hide();
      $('#editBtn').hide();
      $('#mpiBtn').show();
      $('#contentTitle').text("Allergy Data (from OpenEHR in Un-Flat JSON format)");
      $('#content').show();
      $('#content').text(JSON.stringify(data.data, null, 2));  
    })
    .fail(function(error) {
      console.log('Error fetching allergies: ' + error);
    });
  });

  $('#getAllergySchemaBtn').on('click', function(e) {
    $('#contentTitle').text("Fetching allergy schema from OpenEHR. Please wait...");
    $.ajax({
      url: '/openehr/schema/allergies/',
      method: 'GET',
      headers: getHeaders()
    })
    .done(function(data) {
      $('#editBtn').hide();
      $('#mpiBtn').show();
      $('#demographicsForm').hide();
      $('#allergyForm').hide();
      $('#contentTitle').text("Allergy Flat JSON Template (from OpenEHR)");
      $('#content').show();
      $('#content').text(JSON.stringify(data.schema, null, 2));  
    })
    .fail(function(error) {
      console.log('Error fetching allergy schema: ' + error);
    });
  });

  $('#getAllergiesFHIRBtn').on('click', function(e) {
    $('#contentTitle').text('Fetching from OpenEHR as FHIR. Please wait...');  
    $.ajax({
      url: '/openehr/heading/allergies/' + jwt.openid.userId + '?format=fhir',
      method: 'GET',
      headers: getHeaders()
    })
    .done(function(data) {
      $('#editBtn').hide();
      $('#mpiBtn').show();
      $('#demographicsForm').hide();
      $('#allergyForm').hide();
      $('#contentTitle').text("Allergy Data (from OpenEHR in FHIR format)");
      $('#content').show();
      $('#content').text(JSON.stringify(data.data, null, 2));  
    })
    .fail(function(error) {
      console.log('Error fetching allergies: ' + error);
    });
  });

  $('#addAllergyBtn').on('click', function(e) {
    $('#allergyForm').show();
    $('#demographicsForm').hide();
    $('#content').hide();
    $('#contentTitle').text('Add an Allergy');
    if ($('#allergy_causative_agent_code').val() === '') {
      $('#allergy_causative_agent_code').val('91936005');
    }
    $('#allergy_causative_agent_terminology').val('SNOMED-CT');
    if ($('#allergy_manifestation_code').val() === '') {
      $('#allergy_manifestation_code').val('28926001');
    }
    $('#allergy_manifestation_terminology').val('SNOMED-CT');
  });

  $('#cancelAllergyBtn').on('click', function(e) {
    $('#demographicsForm').hide();
    $('#allergyForm').hide();
    $('#mpiBtn').show();
    $('#editBtn').hide();
    $('#content').show();    
    $('#contentTitle').text("");
    $('#content').text("");
  });


  $('#saveAllergyBtn').on('click', function(e) {
    var data = {
      allergies: [
        {
          causative_agent: {
            value: $('#allergy_causative_agent_name').val(),
            code: $('#allergy_causative_agent_code').val(),
            terminology: $('#allergy_causative_agent_terminology').val()
          },
          manifestations: [
            {
              value: $('#allergy_manifestation_name').val(),
              code: $('#allergy_manifestation_code').val(),
              terminology: $('#allergy_manifestation_terminology').val()
            }
          ],
          comment: $('#allergy_comment').val()
        }
      ]
    };

    var message = {
      dataType: 'json',
      data: JSON.stringify(data),
      contentType: 'application/json',
      headers: getHeaders()
    };

    message.url = '/openehr/heading/allergies/' + jwt.openid.userId + '?format=ui';
    message.method = 'POST';

    $.ajax(message)
    .done(function(data) {
      console.log('OpenEHR POST response: ' + JSON.stringify(data, null, 2));
      alert('Allergy saved');
      $('#getAllergiesBtn').click();
    })
    .fail(function(error) {
      console.log('Allergy POST error: ' + error.responseJSON.error);
      alert(error.responseJSON.error);
      $('#allergyForm').hide();
    });

  });

});
