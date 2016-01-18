// Userlist data array for filling in info box
var data = [];

// DOM Ready =============================================================
$(document).ready(function() {

    // Populate the user table on initial page load
    populateSVXY();
     // REGISTER CLICK CALLBACKS ===========================================

    // Refresh button click
    $('#btnRefresh').on('click', refresh);
    
});


//Refresh
function refresh() {
    populateSVXY();
}

// Fill table with data
function populateSVXY() {

    // Empty content string
    var tableContent = '';

    // jQuery AJAX call for JSON
    $.getJSON( '/svxy/getsvxy', function( mydata ) {

    data = mydata;

    // Username link click
    //$('#userList table tbody').on('click', 'td a.linkshowuser', showUserInfo);



        // For each item in our JSON, add a table row and cells to the content string
        $.each(data, function(){
            
            tableContent += '<tr>';
            tableContent += '<td>' + new Date(this.date).toDateString() + '</td>';
            tableContent += '<td>' + this.security + '</td>';
            tableContent += '<td>' + this.typeid + '</td>';
            tableContent += '<td>' + this.shares + '</td>';
            tableContent += '<td>' + this.exposure + '</td>';
            tableContent += '<td>' + this.marketvalue + '</td>';
            //tableContent += '<td><a href="#" class="linkshowuser" rel="' + this.username + '">' + this.username + '</a></td>';
            //tableContent += '<td>' + this.email + '</td>';
            //tableContent += '<td><a href="#" class="linkdeleteuser" rel="' + this._id + '">delete</a></td>';
            tableContent += '</tr>';

        });

        // Inject the whole content string into our existing HTML table
        $('#svxyList table tbody').html(tableContent);
    });
};
