
observeEvent(reactData$sourceDownloadRequest,{

  conf <- reactData$sourceDownloadRequest
  idSource <- conf$idSource
  project <- reactData$project
  language <- reactData$language
  userRole <- getUserRole()
  isGuest <- isGuestUser() # duplicated request, userRole already has this value
  isPublisher <- "publishers" %in% userRole$groups

  #meta <- mxDbGetLayerMeta(idSource)
  #isDownloadable <- isTRUE(.get(meta,c("license","allowDownload")))
  isDownloadable <- "mx_download" %in%  mxDbGetLayerServices(idSource)
  sourceTitle <- mxDbGetLayerTitle(idSource,language=language,asNamedList=FALSE) 
  btnList = list()

  if( !isDownloadable || isGuest ){

    if( isPublisher ){
      #
      # Allow user,if rights match, to manage the source configuration
      #
      layers <- reactListEditSources()
      hasEditRight <- idSource %in% layers
      if(hasEditRight){
        btnList <- list(
          actionButton(
            inputId = "btnEditSourceFromDownload",
            label = "Edit source settings"
          )
        )
      }
    }


    uiDl = tags$h3(d("src_download_issues",language))

    if( isGuest ) {
      uiDl = tagList(uiDl, d("you_not_logged_in",language))
    }
    if( !isDownloadable ){
      uiDl = tagList(uiDl, d("src_download_disabled",language))
    }

    uiOut <- tagList(
      tags$p(uiDl)
      )   

  }else{

    formats <- .get(config,c("data","format"))              
    formatsNames <- sapply(formats,function(x){if(x$type=="vector"){return(x$driver)}})
    countries <- mxDbGetProjectData(project)$countries

    uiOut <- tagList(
      selectizeInput("selectDownloadFormat",
        label = d("download_select_format_vector",language),
        choices = formatsNames,
        multiple = FALSE
        ),
      selectizeInput(
        "selectFilterDataByCountries",
        label = d("download_select_by_countries",language,web=F),
        selected = countries,
        choices = mxGetCountryList(language,includeWorld=F),
        multiple = TRUE
        ),
      numericInput(
        "numEpsgCode",
        label = d("epsg_set_projection_export",language),
        value = 4326,
        ),
      textInput("txtDownloadFileName",
        label = d("download_file_name",language),
        value = subPunct(sourceTitle)
        ),
      uiOutput("uiValidateDownload")
      )

    btnList <- list(
      actionButton(
        inputId = "btnSourceDownload",
        label = d("btn_confirm",language),
        disabled = TRUE
        )
      )
  }

  #
  # create modal
  #
  mxModal(
    id = "modalSourceDownload",
    title = tags$b(sourceTitle),
    content = uiOut,
    textCloseButton = d("btn_cancel",language),
    buttons = btnList
    )
  #
  # Update epsg handler
  #

  if( isDownloadable ){
    mxEpsgBuildSearchBox('#numEpsgCode')
  }

})


#
# Trigger source parameters settings
# see tool_source_manage.R
#
observeEvent(input$btnEditSourceFromDownload,{
  reactData$triggerSourceManage <- list(
     idSource = reactData$sourceDownloadRequest$idSource,
     update =  runif(1)
  )
})

#
# Validation of download format
# 
observe({

  filename <- removeExtension(input$txtDownloadFileName)
  update <- reactData$sourceDownloadRequest
  
  isolate({
    language <- reactData$language
    err <- logical(0)
    btnEnable <- FALSE
    hasFileName <- !noDataCheck(filename)

    err[['txt_too_short_min_3']] <- !hasFileName || nchar(filename) < 3

    output$uiValidateDownload <- renderUI(mxErrorsToUi(errors=err,language=language))

    hasErrors <- any(err)

    mxToggleButton(
      id="btnSourceDownload",
      disable = hasErrors
      )
  })
})


observeEvent(input$btnSourceDownload,{
  mxCatch(title="btnSourceDownload",{


    #
    # Get values
    # 
    conf <- reactData$sourceDownloadRequest
    language <- reactData$language
    idSource <- conf$idSource
    idUser <- reactUser$data$id
    idProject <- reactData$project
    format <- input$selectDownloadFormat
    epsgCode <- as.numeric(input$numEpsgCode)
    emailUser <- reactUser$data$email
    token <- reactUser$token
    emailAdmin <- .get(config,c("mail","admin"))
    filename <- removeExtension(input$txtDownloadFileName)
    filename <- subPunct(filename)
    iso3codes <- input$selectFilterDataByCountries
    sourceTitle <- mxDbGetLayerTitle(idSource,language=language,asNamedList=FALSE)

    mglHandlerDownloadVectorSource(list(
        request = list(
          idSource = idSource,
          email =  emailUser,
          filename = filename,
          format = format,
          iso3codes = iso3codes,
          epsgCode = epsgCode,
          idUser = idUser,
          token = token,
          idProject = idProject,
          language = language
        )
      )
    )

  mxModal(
    id = "modalSourceDownload",
    close = TRUE
    )

  mxFlashIcon('bell')

  })
})




