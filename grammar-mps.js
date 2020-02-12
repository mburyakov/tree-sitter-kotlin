module.exports = grammar({
  name: "KotlinParser_extracted",
  extras: $ => [$.WS],
  rules: {

    start: $ => seq($.expression, ";"),

    expression: $ => $.disjunction,

    constructorInvocation: $ => prec(1, seq(
      $.userType,
      $.valueArguments
    )),

    parameter: $ => seq(
      $.simpleIdentifier,
      optional($.NLS),
      $.COLON,
      optional($.NLS),
      $.type
    ),

    type: $ => prec(1, seq(
      optional($.typeModifiers),
      choice(
        $.parenthesizedType,
        $.nullableType,
        $.typeReference,
        $.functionType
      )
    )),

    typeReference: $ => prec(1, choice(
      $.userType,
      $.DYNAMIC
    )),

    nullableType: $ => prec.right(seq(
      choice(
        $.typeReference,
        $.parenthesizedType
      ),
      optional($.NLS),
      repeat1($.quest)
    )),

    quest: $ => choice(
      $.QUEST_NO_WS,
      $.QUEST_WS
    ),

    userType: $ => prec.right(seq(
      $.simpleUserType,
      repeat(seq(
        optional($.NLS),
        $.DOT,
        optional($.NLS),
        $.simpleUserType
      ))
    )),

    simpleUserType: $ => prec.right(seq(
      $.simpleIdentifier,
      optional(seq(
        optional($.NLS),
        $.typeArguments
      ))
    )),

    typeProjection: $ => choice(
      seq(
        optional($.typeProjectionModifiers),
        $.type
      ),
      $.MULT
    ),

    typeProjectionModifiers: $ => prec.right(repeat1($.typeProjectionModifier)),

    typeProjectionModifier: $ => prec(1, choice(
      seq(
        $.varianceModifier,
        optional($.NLS),
      ),
      $.annotation
    )),

    functionType: $ => seq(
      optional(seq(
        $.receiverType,
        optional($.NLS),
        $.DOT,
        optional($.NLS),
      )),
      $.functionTypeParameters,
      optional($.NLS),
      $.ARROW,
      optional($.NLS),
      $.type
    ),

    functionTypeParameters: $ => seq(
      $.LPAREN,
      optional(seq(optional($.NLS), choice(
        $.parameter,
        $.type
      ))),
      repeat(seq(
        optional($.NLS),
        $.COMMA,
        optional($.NLS),
        choice(
          $.parameter,
          $.type
        )
      )),
      optional($.NLS),
      $.RPAREN
    ),

    parenthesizedType: $ => prec(1, seq(
      $.LPAREN,
      optional($.NLS),
      $.type,
      optional($.NLS),
      $.RPAREN
    )),

    receiverType: $ => prec.right(seq(
      choice(
        $.parenthesizedType,
        $.nullableType,
        $.typeReference
      )
    )),

    label: $ => prec.right(seq(
      $.simpleIdentifier,
      choice(
        $.AT_NO_WS,
        $.AT_POST_WS
      ),
      optional($.NLS)
    )),

    disjunction: $ => prec.right(seq(
      $.conjunction,
      repeat(seq(
        optional($.NLS),
        $.DISJ,
        optional($.NLS),
        $.conjunction
      ))
    )),

    conjunction: $ => prec.right(seq(
      $.equality,
      repeat(seq(
        optional($.NLS),
        $.CONJ,
        optional($.NLS),
        $.equality
      ))
    )),

    equality: $ => prec.right(seq(
      $.comparison,
      repeat(seq(
        $.equalityOperator,
        optional($.NLS),
        $.comparison
      ))
    )),

    comparison: $ => prec.right(seq(
      $.infixOperation,
      optional(seq(
        $.comparisonOperator,
        optional($.NLS),
        $.infixOperation
      ))
    )),

    infixOperation: $ => prec.right(seq(
      $.elvisExpression,
      repeat(choice(
        seq(
          $.inOperator,
          optional($.NLS),
          $.elvisExpression
        ),
        seq(
          $.isOperator,
          optional($.NLS),
          $.type
        )
      ))
    )),

    elvisExpression: $ => prec.right(seq(
      $.infixFunctionCall,
      repeat(seq(
        optional($.NLS),
        $.elvis,
        optional($.NLS),
        $.infixFunctionCall
      ))
    )),

    elvis: $ => seq(
      $.QUEST_NO_WS,
      $.COLON
    ),

    infixFunctionCall: $ => prec.right(seq(
      $.rangeExpression,
      repeat(seq(
        $.simpleIdentifier,
        optional($.NLS),
        $.rangeExpression
      ))
    )),

    rangeExpression: $ => prec.right(seq(
      $.additiveExpression,
      repeat(seq(
        $.RANGE,
        optional($.NLS),
        $.additiveExpression
      ))
    )),

    additiveExpression: $ => prec.right(seq(
      $.multiplicativeExpression,
      repeat(seq(
        $.additiveOperator,
        optional($.NLS),
        $.multiplicativeExpression
      ))
    )),

    multiplicativeExpression: $ => prec.right(seq(
      $.asExpression,
      repeat(seq(
        $.multiplicativeOperator,
        optional($.NLS),
        $.asExpression
      ))
    )),

    asExpression: $ => prec.right(seq(
      $.prefixUnaryExpression,
      optional(seq(
        optional($.NLS),
        $.asOperator,
        optional($.NLS),
        $.type
      ))
    )),

    prefixUnaryExpression: $ => seq(
      repeat($.unaryPrefix),
      $.postfixUnaryExpression
    ),

    unaryPrefix: $ => prec.right(1, choice(
      $.annotation,
      $.label,
      seq(
        $.prefixUnaryOperator,
        optional($.NLS)
      )
    )),

    postfixUnaryExpression: $ => prec.right(choice(
      $.primaryExpression,
      seq(
        $.primaryExpression,
        repeat1($.postfixUnarySuffix)
      )
    )),

    postfixUnarySuffix: $ => choice(
      $.postfixUnaryOperator,
      $.typeArguments,
      $.indexingSuffix,
      $.navigationSuffix
    ),

    indexingSuffix: $ => seq(
      $.LSQUARE,
      optional($.NLS),
      $.expression,
      repeat(seq(
        optional($.NLS),
        $.COMMA,
        optional($.NLS),
        $.expression
      )),
      optional($.NLS),
      $.RSQUARE
    ),

    navigationSuffix: $ => seq(
      optional($.NLS),
      $.memberAccessOperator,
      optional($.NLS),
      choice(
        $.simpleIdentifier,
        $.parenthesizedExpression,
        $.CLASS
      )
    ),

    typeArguments: $ => seq(
      $.LANGLE,
      optional($.NLS),
      $.typeProjection,
      repeat(seq(
        optional($.NLS),
        $.COMMA,
        optional($.NLS),
        $.typeProjection
      )),
      optional($.NLS),
      $.RANGLE
    ),

    valueArguments: $ => choice(
      seq(
        $.LPAREN,
        optional($.NLS),
        $.RPAREN
      ),
      seq(
        $.LPAREN,
        optional($.NLS),
        $.valueArgument,
        repeat(seq(
          optional($.NLS),
          $.COMMA,
          optional($.NLS),
          $.valueArgument
        )),
        optional($.NLS),
        $.RPAREN
      )
    ),

    valueArgument: $ => seq(
      optional(seq($.annotation, optional($.NLS))),
      optional(seq(
        $.simpleIdentifier,
        optional($.NLS),
        $.ASSIGNMENT,
        optional($.NLS)
      )),
      optional(seq($.MULT, optional($.NLS))),
      $.expression
    ),

    primaryExpression: $ => prec(1, choice(
      $.parenthesizedExpression,
      $.simpleIdentifier,
      $.literalConstant,
      $.stringLiteral,
      $.callableReference,
      $.collectionLiteral,
      $.thisExpression,
      $.superExpression,
      $.jumpExpression
    )),

    parenthesizedExpression: $ => seq(
      $.LPAREN,
      optional($.NLS),
      $.expression,
      optional($.NLS),
      $.RPAREN
    ),

    collectionLiteral: $ => choice(
      seq(
        $.LSQUARE,
        optional($.NLS),
        $.expression,
        repeat(seq(
          optional($.NLS),
          $.COMMA,
          optional($.NLS),
          $.expression
        )),
        optional($.NLS),
        $.RSQUARE
      ),
      seq(
        $.LSQUARE,
        optional($.NLS),
        $.RSQUARE
      )
    ),

    literalConstant: $ => choice(
      $.BooleanLiteral,
      $.IntegerLiteral,
      $.HexLiteral,
      $.BinLiteral,
      $.CharacterLiteral,
      $.RealLiteral,
      $.NullLiteral,
      $.LongLiteral,
      $.UnsignedLiteral
    ),

    stringLiteral: $ => choice(
      $.lineStringLiteral,
      $.multiLineStringLiteral
    ),

    lineStringLiteral: $ => seq(
      $.QUOTE_OPEN,
      repeat(choice(
        $.lineStringContent,
        $.lineStringExpression
      )),
      $.QUOTE_CLOSE
    ),

    multiLineStringLiteral: $ => seq(
      $.TRIPLE_QUOTE_OPEN,
      repeat(choice(
        $.multiLineStringContent,
        $.multiLineStringExpression,
      )),
      $.TRIPLE_QUOTE_CLOSE
    ),

    lineStringContent: $ => choice(
      $.LineStrText,
      $.LineStrEscapedChar,
      $.LineStrRef
    ),

    lineStringExpression: $ => seq(
      $.LineStrExprStart,
      $.expression,
      $.RCURL
    ),

    multiLineStringContent: $ => choice(
      $.MultiLineStrText,
      $.MultiLineStringQuote,
      $.MultiLineStrRef
    ),

    multiLineStringExpression: $ => seq(
      $.MultiLineStrExprStart,
      optional($.NLS),
      $.expression,
      optional($.NLS),
      $.RCURL
    ),

    thisExpression: $ => choice(
      $.THIS,
      $.THIS_AT
    ),

    superExpression: $ => prec.left(choice(
      seq(
        $.SUPER,
        optional(seq(
          $.LANGLE,
          optional($.NLS),
          $.type,
          optional($.NLS),
          $.RANGLE
        )),
        optional(seq(
          $.AT_NO_WS,
          $.simpleIdentifier
        ))
      ),
      $.SUPER_AT
    )),

    jumpExpression: $ => prec.right(choice(
      seq(
        $.THROW,
        optional($.NLS),
        $.expression
      ),
      seq(
        choice(
          $.RETURN,
          $.RETURN_AT
        ),
        optional($.expression)
      ),
      $.CONTINUE,
      $.CONTINUE_AT,
      $.BREAK,
      $.BREAK_AT
    )),

    callableReference: $ => seq(
      optional(seq($.receiverType, optional($.NLS))),
      $.COLONCOLON,
      optional($.NLS),
      choice(
        $.simpleIdentifier,
        $.CLASS
      )
    ),

    equalityOperator: $ => choice(
      $.EXCL_EQ,
      $.EXCL_EQEQ,
      $.EQEQ,
      $.EQEQEQ
    ),

    comparisonOperator: $ => choice(
      $.LANGLE,
      $.RANGLE,
      $.LE,
      $.GE
    ),

    inOperator: $ => choice(
      $.IN,
      $.NOT_IN
    ),

    isOperator: $ => choice(
      $.IS,
      $.NOT_IS
    ),

    additiveOperator: $ => choice(
      $.ADD,
      $.SUB
    ),

    multiplicativeOperator: $ => choice(
      $.MULT,
      $.DIV,
      $.MOD
    ),

    asOperator: $ => choice(
      $.AS,
      $.AS_SAFE
    ),

    prefixUnaryOperator: $ => choice(
      $.INCR,
      $.DECR,
      $.SUB,
      $.ADD,
      $.excl
    ),

    postfixUnaryOperator: $ => choice(
      $.INCR,
      $.DECR,
      seq(
        $.EXCL_NO_WS,
        $.excl
      )
    ),

    excl: $ => choice(
      $.EXCL_NO_WS,
      $.EXCL_WS
    ),

    memberAccessOperator: $ => choice(
      $.DOT,
      $.safeNav,
      $.COLONCOLON
    ),

    safeNav: $ => seq(
      $.QUEST_NO_WS,
      $.DOT
    ),

    typeModifiers: $ => prec.right(repeat1($.typeModifier)),

    typeModifier: $ => choice(
      $.annotation,
      seq(
        $.SUSPEND,
        optional($.NLS)
      )
    ),

    varianceModifier: $ => choice(
      $.IN,
      $.OUT
    ),

    annotation: $ => prec.right(seq(
      choice(
        $.singleAnnotation,
        $.multiAnnotation
      ),
      optional($.NLS)
    )),

    singleAnnotation: $ => choice(
      seq(
        $.annotationUseSiteTarget,
        optional($.NLS),
        $.unescapedAnnotation
      ),
      seq(
        choice(
          $.AT_NO_WS,
          $.AT_PRE_WS
        ),
        $.unescapedAnnotation
      )
    ),

    multiAnnotation: $ => choice(
      seq(
        $.annotationUseSiteTarget,
        optional($.NLS),
        $.LSQUARE,
        repeat1($.unescapedAnnotation),
        $.RSQUARE
      ),
      seq(
        choice(
          $.AT_NO_WS,
          $.AT_PRE_WS
        ),
        $.LSQUARE,
        repeat1($.unescapedAnnotation),
        $.RSQUARE
      )
    ),

    annotationUseSiteTarget: $ => seq(
      choice(
        $.AT_NO_WS,
        $.AT_PRE_WS
      ),
      choice(
        $.FIELD,
        $.PROPERTY,
        $.GET,
        $.SET,
        $.RECEIVER,
        $.PARAM,
        $.SETPARAM,
        $.DELEGATE
      ),
      optional($.NLS),
      $.COLON
    ),

    unescapedAnnotation: $ => choice(
      $.constructorInvocation,
      $.userType
    ),

    simpleIdentifier: $ => prec(2, choice(
      $.Identifier,
      $.ABSTRACT,
      $.ANNOTATION,
      $.BY,
      $.CATCH,
      $.COMPANION,
      $.CONSTRUCTOR,
      $.CROSSINLINE,
      $.DATA,
      $.DYNAMIC,
      $.ENUM,
      $.EXTERNAL,
      $.FINAL,
      $.FINALLY,
      $.GET,
      $.IMPORT,
      $.INFIX,
      $.INIT,
      $.INLINE,
      $.INNER,
      $.INTERNAL,
      $.LATEINIT,
      $.NOINLINE,
      $.OPEN,
      $.OPERATOR,
      $.OUT,
      $.OVERRIDE,
      $.PRIVATE,
      $.PROTECTED,
      $.PUBLIC,
      $.REIFIED,
      $.SEALED,
      $.TAILREC,
      $.SET,
      $.VARARG,
      $.WHERE,
      $.FIELD,
      $.PROPERTY,
      $.RECEIVER,
      $.PARAM,
      $.SETPARAM,
      $.DELEGATE,
      $.FILE,
      $.EXPECT,
      $.ACTUAL,
      $.CONST,
      $.SUSPEND
    )),

    DelimitedComment: $ => token(seq(
      "/*",
      repeat(/.|\n/),
      "*/"
    )),

    LineComment: $ => token(seq(
      "//",
      repeat(/[^\r\n]/)
    )),

    WS: $ => token(/[\u0020\u0009\u000C]/),

    NL: $ => token(choice(
        "\n",
        seq(
            "\r",
            optional("\n")
        )
    )),

    NLS: $ => token(/(\n|\r\n)*/),

    Hidden: $ => token(choice(
      seq(
        "/*",
        repeat(/.|\n/),
        "*/"
      ),
      token(seq(
        "//",
        repeat(/[^\r\n]/)
      )),
      token(/[\u0020\u0009\u000C]/)
    )),

    DOT: $ => token("."),

    COMMA: $ => token(","),

    LPAREN: $ => token("("),

    RPAREN: $ => token(")"),

    LSQUARE: $ => token("["),

    RSQUARE: $ => token("]"),

    RCURL: $ => token("}"),

    MULT: $ => token("*"),

    MOD: $ => token("%"),

    DIV: $ => token("/"),

    ADD: $ => token("+"),

    SUB: $ => token("-"),

    INCR: $ => token("++"),

    DECR: $ => token("--"),

    CONJ: $ => token("&&"),

    DISJ: $ => token("||"),

    EXCL_WS: $ => token(seq(
      "!",
      choice(
        seq(
          "/*",
          repeat(/.|\n/),
          "*/"
        ),
        token(seq(
          "//",
          repeat(/[^\r\n]/)
        )),
        token(/[\u0020\u0009\u000C]/)
      )
    )),

    EXCL_NO_WS: $ => token("!"),

    COLON: $ => token(":"),

    ASSIGNMENT: $ => token("="),

    ARROW: $ => token("->"),

    RANGE: $ => token(".."),

    COLONCOLON: $ => token("::"),

    AT_NO_WS: $ => token("@"),

    AT_POST_WS: $ => token(seq(
      "@",
      choice(
        choice(
          seq(
            "/*",
            repeat(/.|\n/),
            "*/"
          ),
          token(seq(
            "//",
            repeat(/[^\r\n]/)
          )),
          token(/[\u0020\u0009\u000C]/)
        ),
        token(choice(
          "\n",
          seq(
            "\r",
            optional("\n")
          )
        ))
      )
    )),

    AT_PRE_WS: $ => token(seq(
      choice(
        choice(
          seq(
            "/*",
            repeat(/.|\n/),
            "*/"
          ),
          token(seq(
            "//",
            repeat(/[^\r\n]/)
          )),
          token(/[\u0020\u0009\u000C]/)
        ),
        token(choice(
          "\n",
          seq(
            "\r",
            optional("\n")
          )
        ))
      ),
      "@"
    )),

    QUEST_WS: $ => token(seq(
      "?",
      choice(
        seq(
          "/*",
          repeat(/.|\n/),
          "*/"
        ),
        token(seq(
          "//",
          repeat(/[^\r\n]/)
        )),
        token(/[\u0020\u0009\u000C]/)
      )
    )),

    QUEST_NO_WS: $ => token("?"),

    LANGLE: $ => token("<"),

    RANGLE: $ => token(">"),

    LE: $ => token("<="),

    GE: $ => token(">="),

    EXCL_EQ: $ => token("!="),

    EXCL_EQEQ: $ => token("!=="),

    AS_SAFE: $ => token("as?"),

    EQEQ: $ => token("=="),

    EQEQEQ: $ => token("==="),

    RETURN_AT: $ => token(seq(
      "return@",
      choice(
        seq(
          choice(
            /[a-zA-Z]/,
            "_"
          ),
          repeat(choice(
            /[a-zA-Z]/,
            "_",
            /[0-9]/
          ))
        ),
        seq(
          "`",
          repeat1(/[^\r\n`]/),
          "`"
        )
      )
    )),

    CONTINUE_AT: $ => token(seq(
      "continue@",
      choice(
        seq(
          choice(
            /[a-zA-Z]/,
            "_"
          ),
          repeat(choice(
            /[a-zA-Z]/,
            "_",
            /[0-9]/
          ))
        ),
        seq(
          "`",
          repeat1(/[^\r\n`]/),
          "`"
        )
      )
    )),

    BREAK_AT: $ => token(seq(
      "break@",
      choice(
        seq(
          choice(
            /[a-zA-Z]/,
            "_"
          ),
          repeat(choice(
            /[a-zA-Z]/,
            "_",
            /[0-9]/
          ))
        ),
        seq(
          "`",
          repeat1(/[^\r\n`]/),
          "`"
        )
      )
    )),

    THIS_AT: $ => token(seq(
      "this@",
      choice(
        seq(
          choice(
            /[a-zA-Z]/,
            "_"
          ),
          repeat(choice(
            /[a-zA-Z]/,
            "_",
            /[0-9]/
          ))
        ),
        seq(
          "`",
          repeat1(/[^\r\n`]/),
          "`"
        )
      )
    )),

    SUPER_AT: $ => token(seq(
      "super@",
      choice(
        seq(
          choice(
            /[a-zA-Z]/,
            "_"
          ),
          repeat(choice(
            /[a-zA-Z]/,
            "_",
            /[0-9]/
          ))
        ),
        seq(
          "`",
          repeat1(/[^\r\n`]/),
          "`"
        )
      )
    )),

    FILE: $ => token("file"),

    FIELD: $ => token("field"),

    PROPERTY: $ => token("property"),

    GET: $ => token("get"),

    SET: $ => token("set"),

    RECEIVER: $ => token("receiver"),

    PARAM: $ => token("param"),

    SETPARAM: $ => token("setparam"),

    DELEGATE: $ => token("delegate"),

    IMPORT: $ => token("import"),

    CLASS: $ => token("class"),

    CONSTRUCTOR: $ => token("constructor"),

    BY: $ => token("by"),

    COMPANION: $ => token("companion"),

    INIT: $ => token("init"),

    THIS: $ => token("this"),

    SUPER: $ => token("super"),

    WHERE: $ => token("where"),

    CATCH: $ => token("catch"),

    FINALLY: $ => token("finally"),

    THROW: $ => token("throw"),

    RETURN: $ => token("return"),

    CONTINUE: $ => token("continue"),

    BREAK: $ => token("break"),

    AS: $ => token("as"),

    IS: $ => token("is"),

    IN: $ => token("in"),

    NOT_IS: $ => token(seq(
      "!is",
      choice(
        choice(
          seq(
            "/*",
            repeat(/.|\n/),
            "*/"
          ),
          token(seq(
            "//",
            repeat(/[^\r\n]/)
          )),
          token(/[\u0020\u0009\u000C]/)
        ),
        token(choice(
          "\n",
          seq(
            "\r",
            optional("\n")
          )
        ))
      )
    )),

    NOT_IN: $ => token(seq(
      "!in",
      choice(
        choice(
          seq(
            "/*",
            repeat(/.|\n/),
            "*/"
          ),
          token(seq(
            "//",
            repeat(/[^\r\n]/)
          )),
          token(/[\u0020\u0009\u000C]/)
        ),
        token(choice(
          "\n",
          seq(
            "\r",
            optional("\n")
          )
        ))
      )
    )),

    OUT: $ => token("out"),

    DYNAMIC: $ => token("dynamic"),

    PUBLIC: $ => token("public"),

    PRIVATE: $ => token("private"),

    PROTECTED: $ => token("protected"),

    INTERNAL: $ => token("internal"),

    ENUM: $ => token("enum"),

    SEALED: $ => token("sealed"),

    ANNOTATION: $ => token("annotation"),

    DATA: $ => token("data"),

    INNER: $ => token("inner"),

    TAILREC: $ => token("tailrec"),

    OPERATOR: $ => token("operator"),

    INLINE: $ => token("inline"),

    INFIX: $ => token("infix"),

    EXTERNAL: $ => token("external"),

    SUSPEND: $ => token("suspend"),

    OVERRIDE: $ => token("override"),

    ABSTRACT: $ => token("abstract"),

    FINAL: $ => token("final"),

    OPEN: $ => token("open"),

    CONST: $ => token("const"),

    LATEINIT: $ => token("lateinit"),

    VARARG: $ => token("vararg"),

    NOINLINE: $ => token("noinline"),

    CROSSINLINE: $ => token("crossinline"),

    REIFIED: $ => token("reified"),

    EXPECT: $ => token("expect"),

    ACTUAL: $ => token("actual"),

    DecDigit: $ => token(/[0123456789]/),

    DecDigitNoZero: $ => token(/[123456789]/),

    DecDigitOrSeparator: $ => token(choice(
      token(/[0123456789]/),
      "_"
    )),

    DecDigits: $ => token(choice(
      seq(
        token(/[0123456789]/),
        repeat(choice(
          token(/[0123456789]/),
          "_"
        )),
        token(/[0123456789]/)
      ),
      token(/[0123456789]/)
    )),

    DoubleExponent: $ => token(seq(
      /[eE]/,
      optional(/[+-]/),
      choice(
        seq(
          token(/[0123456789]/),
          repeat(choice(
            token(/[0123456789]/),
            "_"
          )),
          token(/[0123456789]/)
        ),
        token(/[0123456789]/)
      )
    )),

    RealLiteral: $ => token(choice(
      choice(
        seq(
          choice(
            seq(
              optional(choice(
                seq(
                  token(/[0123456789]/),
                  repeat(choice(
                    token(/[0123456789]/),
                    "_"
                  )),
                  token(/[0123456789]/)
                ),
                token(/[0123456789]/)
              )),
              ".",
              choice(
                seq(
                  token(/[0123456789]/),
                  repeat(choice(
                    token(/[0123456789]/),
                    "_"
                  )),
                  token(/[0123456789]/)
                ),
                token(/[0123456789]/)
              ),
              optional(seq(
                /[eE]/,
                optional(/[+-]/),
                choice(
                  seq(
                    token(/[0123456789]/),
                    repeat(choice(
                      token(/[0123456789]/),
                      "_"
                    )),
                    token(/[0123456789]/)
                  ),
                  token(/[0123456789]/)
                )
              ))
            ),
            seq(
              choice(
                seq(
                  token(/[0123456789]/),
                  repeat(choice(
                    token(/[0123456789]/),
                    "_"
                  )),
                  token(/[0123456789]/)
                ),
                token(/[0123456789]/)
              ),
              seq(
                /[eE]/,
                optional(/[+-]/),
                choice(
                  seq(
                    token(/[0123456789]/),
                    repeat(choice(
                      token(/[0123456789]/),
                      "_"
                    )),
                    token(/[0123456789]/)
                  ),
                  token(/[0123456789]/)
                )
              )
            )
          ),
          /[fF]/
        ),
        seq(
          choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          ),
          /[fF]/
        )
      ),
      choice(
        seq(
          optional(choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          )),
          ".",
          choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          ),
          optional(seq(
            /[eE]/,
            optional(/[+-]/),
            choice(
              seq(
                token(/[0123456789]/),
                repeat(choice(
                  token(/[0123456789]/),
                  "_"
                )),
                token(/[0123456789]/)
              ),
              token(/[0123456789]/)
            )
          ))
        ),
        seq(
          choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          ),
          seq(
            /[eE]/,
            optional(/[+-]/),
            choice(
              seq(
                token(/[0123456789]/),
                repeat(choice(
                  token(/[0123456789]/),
                  "_"
                )),
                token(/[0123456789]/)
              ),
              token(/[0123456789]/)
            )
          )
        )
      )
    )),

    FloatLiteral: $ => token(choice(
      seq(
        choice(
          seq(
            optional(choice(
              seq(
                token(/[0123456789]/),
                repeat(choice(
                  token(/[0123456789]/),
                  "_"
                )),
                token(/[0123456789]/)
              ),
              token(/[0123456789]/)
            )),
            ".",
            choice(
              seq(
                token(/[0123456789]/),
                repeat(choice(
                  token(/[0123456789]/),
                  "_"
                )),
                token(/[0123456789]/)
              ),
              token(/[0123456789]/)
            ),
            optional(seq(
              /[eE]/,
              optional(/[+-]/),
              choice(
                seq(
                  token(/[0123456789]/),
                  repeat(choice(
                    token(/[0123456789]/),
                    "_"
                  )),
                  token(/[0123456789]/)
                ),
                token(/[0123456789]/)
              )
            ))
          ),
          seq(
            choice(
              seq(
                token(/[0123456789]/),
                repeat(choice(
                  token(/[0123456789]/),
                  "_"
                )),
                token(/[0123456789]/)
              ),
              token(/[0123456789]/)
            ),
            seq(
              /[eE]/,
              optional(/[+-]/),
              choice(
                seq(
                  token(/[0123456789]/),
                  repeat(choice(
                    token(/[0123456789]/),
                    "_"
                  )),
                  token(/[0123456789]/)
                ),
                token(/[0123456789]/)
              )
            )
          )
        ),
        /[fF]/
      ),
      seq(
        choice(
          seq(
            token(/[0123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        ),
        /[fF]/
      )
    )),

    DoubleLiteral: $ => token(choice(
      seq(
        optional(choice(
          seq(
            token(/[0123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        )),
        ".",
        choice(
          seq(
            token(/[0123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        ),
        optional(seq(
          /[eE]/,
          optional(/[+-]/),
          choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          )
        ))
      ),
      seq(
        choice(
          seq(
            token(/[0123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        ),
        seq(
          /[eE]/,
          optional(/[+-]/),
          choice(
            seq(
              token(/[0123456789]/),
              repeat(choice(
                token(/[0123456789]/),
                "_"
              )),
              token(/[0123456789]/)
            ),
            token(/[0123456789]/)
          )
        )
      )
    )),

    IntegerLiteral: $ => token(choice(
      seq(
        token(/[123456789]/),
        repeat(choice(
          token(/[0123456789]/),
          "_"
        )),
        token(/[0123456789]/)
      ),
      token(/[0123456789]/)
    )),

    HexDigit: $ => token(/[0-9a-fA-F]/),

    HexDigitOrSeparator: $ => token(choice(
      token(/[0-9a-fA-F]/),
      "_"
    )),

    HexLiteral: $ => token(choice(
      seq(
        "0",
        /[xX]/,
        token(/[0-9a-fA-F]/),
        repeat(choice(
          token(/[0-9a-fA-F]/),
          "_"
        )),
        token(/[0-9a-fA-F]/)
      ),
      seq(
        "0",
        /[xX]/,
        token(/[0-9a-fA-F]/)
      )
    )),

    BinDigit: $ => token(/[01]/),

    BinDigitOrSeparator: $ => token(choice(
      token(/[01]/),
      "_"
    )),

    BinLiteral: $ => token(choice(
      seq(
        "0",
        /[bB]/,
        token(/[01]/),
        repeat(choice(
          token(/[01]/),
          "_"
        )),
        token(/[01]/)
      ),
      seq(
        "0",
        /[bB]/,
        token(/[01]/)
      )
    )),

    UnsignedLiteral: $ => token(seq(
      choice(
        choice(
          seq(
            token(/[123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        ),
        choice(
          seq(
            "0",
            /[xX]/,
            token(/[0-9a-fA-F]/),
            repeat(choice(
              token(/[0-9a-fA-F]/),
              "_"
            )),
            token(/[0-9a-fA-F]/)
          ),
          seq(
            "0",
            /[xX]/,
            token(/[0-9a-fA-F]/)
          )
        ),
        choice(
          seq(
            "0",
            /[bB]/,
            token(/[01]/),
            repeat(choice(
              token(/[01]/),
              "_"
            )),
            token(/[01]/)
          ),
          seq(
            "0",
            /[bB]/,
            token(/[01]/)
          )
        )
      ),
      /[uU]/,
      optional("L")
    )),

    LongLiteral: $ => token(seq(
      choice(
        choice(
          seq(
            token(/[123456789]/),
            repeat(choice(
              token(/[0123456789]/),
              "_"
            )),
            token(/[0123456789]/)
          ),
          token(/[0123456789]/)
        ),
        choice(
          seq(
            "0",
            /[xX]/,
            token(/[0-9a-fA-F]/),
            repeat(choice(
              token(/[0-9a-fA-F]/),
              "_"
            )),
            token(/[0-9a-fA-F]/)
          ),
          seq(
            "0",
            /[xX]/,
            token(/[0-9a-fA-F]/)
          )
        ),
        choice(
          seq(
            "0",
            /[bB]/,
            token(/[01]/),
            repeat(choice(
              token(/[01]/),
              "_"
            )),
            token(/[01]/)
          ),
          seq(
            "0",
            /[bB]/,
            token(/[01]/)
          )
        )
      ),
      "L"
    )),

    BooleanLiteral: $ => token(choice(
      "true",
      "false"
    )),

    NullLiteral: $ => token("null"),

    CharacterLiteral: $ => token(seq(
      "\'",
      choice(
        choice(
          seq(
            "\\",
            "u",
            token(/[0-9a-fA-F]/),
            token(/[0-9a-fA-F]/),
            token(/[0-9a-fA-F]/),
            token(/[0-9a-fA-F]/)
          ),
          token(seq(
            "\\",
            choice(
              "t",
              "b",
              "r",
              "n",
              "\'",
              "\"",
              "\\",
              "$"
            )
          ))
        ),
        /[^\n\r'\\]/
      ),
      "\'"
    )),

    UnicodeDigit: $ => token(/[0-9]/),

    Identifier: $ => token(choice(
      seq(
        choice(
          /[a-zA-Z]/,
          "_"
        ),
        repeat(choice(
          /[a-zA-Z]/,
          "_",
          /[0-9]/
        ))
      ),
      seq(
        "`",
        repeat1(/[^\r\n`]/),
        "`"
      )
    )),

    UniCharacterLiteral: $ => token(seq(
      "\\",
      "u",
      token(/[0-9a-fA-F]/),
      token(/[0-9a-fA-F]/),
      token(/[0-9a-fA-F]/),
      token(/[0-9a-fA-F]/)
    )),

    EscapedIdentifier: $ => token(seq(
      "\\",
      choice(
        "t",
        "b",
        "r",
        "n",
        "\'",
        "\"",
        "\\",
        "$"
      )
    )),

    EscapeSeq: $ => token(choice(
      seq(
        "\\",
        "u",
        token(/[0-9a-fA-F]/),
        token(/[0-9a-fA-F]/),
        token(/[0-9a-fA-F]/),
        token(/[0-9a-fA-F]/)
      ),
      token(seq(
        "\\",
        choice(
          "t",
          "b",
          "r",
          "n",
          "\'",
          "\"",
          "\\",
          "$"
        )
      ))
    )),

    Letter: $ => token(/[a-zA-Z]/),

    QUOTE_OPEN: $ => token("\""),

    TRIPLE_QUOTE_OPEN: $ => token("\"\"\""),

    EOF: $ => token(/[\r\n]/),

    QUOTE_CLOSE: $ => token("\""),

    TRIPLE_QUOTE_CLOSE: $ => token("\"\"\""),

    UNICODE_CLASS_ND: $ => token(/[0-9]/),

    UNICODE_CLASS_LL: $ => token(/[A-Za-z]/),

    UNICODE_CLASS_LM: $ => token("#####################LM"),

    UNICODE_CLASS_LO: $ => token("#####################LO"),

    UNICODE_CLASS_LT: $ => token("#####################LT"),

    UNICODE_CLASS_LU: $ => token("#####################LU"),

    UNICODE_CLASS_NL: $ => token("#####################NL"),

    MultiLineStringQuote: $ => token("#####################1"),

    LineStrText: $ => token("#####################2"),

    LineStrEscapedChar: $ => token("#####################3"),

    LineStrRef: $ => token("#####################4"),

    LineStrExprStart: $ => token("#####################5"),

    MultiLineStrText: $ => token("#####################6"),

    MultiLineStrRef: $ => token("#####################7"),

    MultiLineStrExprStart: $ => token("#####################8"),

    }
});